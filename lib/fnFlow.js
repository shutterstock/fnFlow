var async = require('async');
var us = require('underscore');
var FlowTaskError = require('./flowTaskError');

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
      flowGo(dataItem, tasks, dataItem[contextName], function(err, results){
        if(contextName) cb(err, us.pick(results, Object.keys(tasks)));
        else cb(err, results);
      })
    }, callback);
  } else {
    return flowGo(data, tasks, null, callback);
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

  if(taskArgs instanceof SubFlow) {
    var subFlow = taskArgs;
    if(!tasks.hasOwnProperty(subFlow.dataName) && (!data || !data.hasOwnProperty(subFlow.dataName))) throw new FlowTaskError(taskName, "SubFlow data '" + subFlow.dataName + "' does not exist.");
    fn = { receiverName: subFlow.dataName, tasks: subFlow.tasks };
    var prereqs = scanForPrereqs(subFlow.tasks, us.extend({}, data, tasks));
    autoTask.push(subFlow.dataName);        
    autoTask = autoTask.concat(Object.keys(prereqs));
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
        var subFlow = taskArg;
        if(fn) throw new FlowTaskError(taskName, "More than one function specified (at index " + fnIndex + " and " + i + ").");
        if(i < taskArgs.length - 1) throw new FlowTaskError(taskName, "SubFlows must be the at the last index.");
        if(!tasks.hasOwnProperty(subFlow.dataName) && (!data || !data.hasOwnProperty(subFlow.dataName))) throw new FlowTaskError(taskName, "SubFlow data '" + subFlow.dataName + "' does not exist.");
        fn = { receiverName: subFlow.dataName, tasks: subFlow.tasks };
        fnIndex = i;
        var prereqs = scanForPrereqs(subFlow.tasks, us.extend({}, data, tasks));
        autoTask.push(subFlow.dataName);        
        autoTask = autoTask.concat(Object.keys(prereqs));        
      } else if((tasks.hasOwnProperty(taskArg) || data && data.hasOwnProperty(taskArg) || context && context.hasOwnProperty(taskArg) && typeof context[taskArg] != 'function') && taskArg != taskName) {
        if(fn) args.push(taskArg);
        autoTask.push(taskArg);
      } else {
        if(fn) throw new FlowTaskError(taskName, "More than one function specified (at index " + fnIndex + " and " + i + ").");
        fn = { name: taskArg, receiverName: taskArgs[i - 1] };
        fnIndex = i;
        if(!fn.receiverName) throw new FlowTaskError(taskName, "Unknown symbol at index '" + i + "' must be either the name of a task, the name of data, or be the name of a function on the result of a task or data");
      }
    }
    if(!fn) console.log(taskArgs)
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

  if(typeof fn == 'object' && fn.tasks) {
    autoTask.push(function(cb, results){
      var arrayData = results[fn.receiverName];
      var newData = arrayData.map(function(dataItem){ 
        var newDataItem = us.extend({}, results); 
        newDataItem[fn.receiverName] = dataItem;
        return newDataItem;
      });
      flowExec(newData, fn.tasks, fn.receiverName, cb);
    });
  } else {
    autoTask.push(function(cb, results){
      var fnArgs = [];
      for(var i in args) {
        var arg = args[i];
        fnArgs[i] = results[arg];
      }
      fnArgs.push(cb);

      var receiver;
      if(typeof fn != 'function') {
        var receiverName = fn.receiverName;
        receiver = results[receiverName];
        var fnName = fn.name;
        if(!receiver) throw new FlowTaskError(taskName, "Cannot call function '" + fn.name + "' on " + receiver);
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
        } else if(allTasks.hasOwnProperty(taskArg)) {
          prereqs[taskArg] = true;
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
};
module.exports.flow.subFlow = function(dataName, tasks) {
  return new SubFlow(dataName, tasks);
};