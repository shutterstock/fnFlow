var async = require('async');
var us = require('underscore');
var FlowTaskError = require('./flowTaskError');
var FlowTaskArgumentNullError = require('./flowTaskArgumentNullError');

module.exports = {
  flow: function flow(data, tasks, callback){
    if(arguments.length == 2){
      if(typeof tasks == 'function'){
        callback = tasks;
        tasks = data;
        data = undefined;
      }
    } else if(arguments.length == 1){
      tasks = data;
      callback = undefined;
      data = undefined;
    }

    flowExec(data, tasks, null, callback);
  }
}

var flowExec = function flowExec(data, tasks, contextName, callback) {
  if (data instanceof Array) {
    return async.map(data, function (dataItem, cb) {
      var context;
      if(contextName) context = dataItem[contextName]
      flowGo(dataItem, tasks, context, function(err, results){
        if(contextName) cb(err, us.pick(results, Object.keys(tasks)));
        else cb(err, results);
      })
    }, callback);
  } else {
    var context;
    if(contextName) context = data[contextName];
    return flowGo(data, tasks, context, function(err, results){
      if(contextName) callback(err, us.pick(results, Object.keys(tasks)));
      else callback(err, results);
    });
  }
}

var flowGo = function flowGo(data, tasks, context, callback) {
  var newTasks;
  if(data) newTasks = us.object(Object.keys(data), us.map(Object.keys(data), function(key){ return function(cb){ cb(null, data[key]); } }))
  if(context) us.extend(newTasks, us.object(Object.keys(context), us.map(Object.keys(context), function(key){ return function(cb){ cb(null, context[key]); } })));
  if(tasks) us.extend(newTasks, us.object(Object.keys(tasks), us.map(Object.keys(tasks), function(key){ 
    var taskPlan = interpretTask(tasks[key], key, tasks, data, context);
    return flowCall(taskPlan, key); 
  } )));
  return async.auto(newTasks, callback);
}

var interpretTask = function interpretTask(taskArgs, taskName, tasks, data, context) {
  var fn;             //function to call within each async.auto task (does the work).
  var fnIndex;        //index where fn was found.
  var args = [];      //arguments to pass to each function during task execution
  var autoTask = [];  //array value for each async.auto task

  var interpretSubFlow = function(subFlow){
    if(fn) throw new FlowTaskError(taskName, "A task may have a SubFlow (index " + i + ") or a function call (index " + i + "), but not both. " + fnIndex + " and " + i + ").");
    if(Array.isArray(taskArgs) && i < taskArgs.length - 1) throw new FlowTaskError(taskName, "SubFlows must be the at the last index.");
    if(!tasks.hasOwnProperty(subFlow.dataName) && (!data || !data.hasOwnProperty(subFlow.dataName)) || subFlow.dataName == taskName) throw new FlowTaskError(taskName, "SubFlow data '" + subFlow.dataName + "' does not exist. Provide the name of a task or data from the parent flow.  Possible values include: " + Object.keys(tasks).concat(Object.keys(data)).filter(function(name){ return name != taskName }).join(', '));
    fn = { receiverName: subFlow.dataName, tasks: subFlow.tasks };
    var prereqs = scanForPrereqs(subFlow.tasks, us.extend({}, data, tasks));
    autoTask.push(subFlow.dataName);        
    autoTask = autoTask.concat(Object.keys(prereqs));
  }

  if(taskArgs instanceof SubFlow) {
    interpretSubFlow(taskArgs);
  } else if(typeof taskArgs == 'function') {
    fn = taskArgs;
  } else if(Array.isArray(taskArgs)) {
    for(var i in taskArgs) {
      var taskArg = taskArgs[i];
      if(typeof taskArg == 'function') {
        if(fn) throw new FlowTaskError(taskName, "More than one function specified (at index " + fnIndex + " and " + i + ").");
        fn = taskArg;
        fnIndex = i;
      } else if(taskArg instanceof SubFlow) {
        interpretSubFlow(taskArg);
        fnIndex = i;
      } else if(typeof taskArg == 'string') {
        var taskArgParts = taskArg.split('.');
        taskArg = taskArgParts[0];
        if((tasks.hasOwnProperty(taskArg) || data && data.hasOwnProperty(taskArg) || context && context.hasOwnProperty(taskArg) && typeof context[taskArg] != 'function') && taskArg != taskName) {
          if(fn) args.push(taskArgParts);
          else if(taskArgParts.length > 1) {
            fn = { name: taskArgParts.pop(), receiverName: taskArgParts };
            fnIndex = i;              
          }
          autoTask.push(taskArg);
        } else if(fn) throw new FlowTaskError(taskName, "More than one function specified (at index " + fnIndex + " and " + i + ").");
        else if(taskArgParts.length > 1 || !taskArgs[i - 1]) throw new FlowTaskError(taskName, "Unknown symbol at index '" + i + "' must be either the name of a task, the name of data, or be the name of a function on the result of a task or data");
        else {
          fn = { name: taskArg, receiverName: taskArgs[i - 1] };
          fnIndex = i;
        }
      } else throw new FlowTaskError(taskName, "Unknown symbol at index '" + i + "' must be either the name of a task, the name of data, or be the name of a function on the result of a task or data");
    }
    if(!fn) throw new FlowTaskError(taskName, "Function required.");
  } else {
    throw new FlowTaskError(taskName, "Invalid flow type. Must be function, or array.");
  }

  return { fn: fn, args: args, autoTask: autoTask };
}

var flowCall = function flowCall(taskPlan, taskName) {
  var fn = taskPlan.fn;
  var args = taskPlan.args;
  var autoTask = taskPlan.autoTask;

  if(typeof fn == 'object' && fn.tasks) {  //subflows
    autoTask.push(function(cb, results){
      var rawResultData = results[fn.receiverName];
      if(rawResultData === null || rawResultData === undefined) {
        throw new FlowTaskError(taskName, "Result of '" + fn.receiverName + "' returned no data. Could not start SubFlow.");
      } else if(Array.isArray(rawResultData)) {
        var newData = rawResultData.map(function(dataItem){ 
          var newDataItem = us.extend({}, results); 
          newDataItem[fn.receiverName] = dataItem;
          return newDataItem;
        });
      } else {
        var newData = us.extend({}, results); 
        newData[fn.receiverName] = rawResultData;
      }
      flowExec(newData, fn.tasks, fn.receiverName, cb);
    });
  } else {
    autoTask.push(function(cb, results){
      var fnArgs = [];
      for(var i in args) {
        var arg = args[i];
        if(Array.isArray(arg)) {
          var result = results;
          for(var j in arg) {
            if(result === undefined) return cb(new FlowTaskArgumentNullError(taskName, arg[j-1], arg[j]));
            result = result[arg[j]];
          }
          fnArgs[i] = result;
        } else fnArgs[i] = results[arg];
      }
      fnArgs.push(cb);

      var receiver;
      if(typeof fn != 'function') {
        var receiverName = fn.receiverName;
        receiver = results[receiverName];
        var fnName = fn.name;
        if(!receiver) return cb(new FlowTaskArgumentNullError(taskName, receiverName, fnName));
        fn = receiver[fnName];
        if(!fn) throw new FlowTaskError(taskName, "Unknown symbol '" + fnName + "' must be either the name of a task, the name of data, or the name of a function on '" + receiverName + "'");
      }

      try {
        fn.apply(receiver, fnArgs);
      } catch(e){
        throw new FlowTaskError(taskName, "Error during execution of function.", e);
      }
    });
  }

  return autoTask;
}

var scanForPrereqs = function scanForPrereqs(tasks, allTasks) {
  var prereqs = {};
  for(var taskName in tasks) {
    var taskArgs = tasks[taskName];
    if(taskArgs instanceof SubFlow){
      us.extend(prereqs, scanForPrereqs(taskArgs.tasks, us.extend({}, allTasks, tasks)));
    } else if(Array.isArray(taskArgs)){
      for(var i in taskArgs) {
        var taskArg = taskArgs[i];
        if(taskArg instanceof SubFlow) {
          us.extend(prereqs, scanForPrereqs(taskArg.tasks, us.extend({}, allTasks, tasks)));
        } else if(typeof taskArg == 'function') {
        } else if(typeof taskArg == 'string') {
          taskArg = taskArg.split('.')[0];
          if(allTasks.hasOwnProperty(taskArg)) {
            prereqs[taskArg] = true;
          }
        } else {
        }
      }
    }
  }
  return prereqs;
}



var SubFlow = function(dataName, tasks){
  this.dataName = dataName;
  this.tasks = tasks;
  if(!dataName) throw new Error("SubFlow error: No data given for subFlow. Provide the name of a task or data from the parent flow.");
  if(!tasks) throw new Error("SubFlow error: No tasks given for subFlow.");
};
module.exports.flow.subFlow = function(dataName, tasks) {
  return new SubFlow(dataName, tasks);
};