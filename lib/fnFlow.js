var util = require('util');
var async = require('async');
var us = require('underscore');
var errors = require('errors');
var FlowTaskError = require('./flowTaskError');
var FlowTaskArgumentNullError = require('./flowTaskArgumentNullError');
var Task = require('./flowTask').Task;
var AsyncTask = require('./flowTask').AsyncTask;
var SyncTask = require('./flowTask').SyncTask;

module.exports = {
  flow: function flow(data, tasks, callback){
    var workflow = new Workflow(data, tasks, callback);
    workflow.execute();
  }
}

var Workflow = function Workflow(data, tasks, callback){
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

  this.data = data;
  this.tasks = tasks;
  this.callback = callback || function(){};
}

Workflow.prototype.execute = function execute(contextName) {
  var self = this;
  self.contextName = contextName;
  var exec = function(data, cb){
    var context;
    if(contextName) context = data[contextName];

    var newTasks;
    if(data) newTasks = us.object(Object.keys(data), us.map(Object.keys(data), function(key){ return function(cb){ cb(null, data[key]); } }))
    if(context) us.extend(newTasks, us.object(Object.keys(context), us.map(Object.keys(context), function(key){ return function(cb){ cb(null, context[key]); } })));
    if(self.tasks) us.extend(newTasks, us.object(Object.keys(self.tasks), us.map(Object.keys(self.tasks), function(taskName){
      var taskPlan = self.interpretTask(taskName, data, context); 
      return self.executeTaskPlan(taskPlan, taskName); 
    } )));
    return async.auto(newTasks, function(err, results){
      if(contextName) cb(err, us.pick(results, Object.keys(self.tasks)));
      else cb(err, results);
    });
  };

  if (this.data instanceof Array) async.map(this.data, exec, this.callback);
  else exec(this.data, this.callback);  
}

Workflow.prototype.interpretTask = function interpretTask(taskName, data, context) {
  var self = this;
  var taskArgs = Array.isArray(self.tasks[taskName]) ? new AsyncTask(self.tasks[taskName]) : self.tasks[taskName];
  this.tasks[taskName] = taskArgs;
  var tasks = self.tasks;

  var fn;             //function to call within each async.auto task (does the work).
  var fnIndex;        //index where fn was found.
  var args = [];      //arguments to pass to each function during task execution
  var autoTask = [];  //array value for each async.auto task
  var task = taskArgs instanceof Task ? taskArgs : null;

  var interpretSubFlow = function(subFlow){
    if(fn) throw new FlowTaskError(taskName, "A task may have a SubFlow (index " + i + ") or a function call (index " + i + "), but not both. " + fnIndex + " and " + i + ").");
    if(taskArgs instanceof Task && i < taskArgs.task_array.length - 1) throw new FlowTaskError(taskName, "SubFlows must be at the last index.");
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
  } else if(task) {
    task.name = taskName;
    task.workflow = self;
    task.task_requirements = [];
    task.data_requirements = [];
    // task.context_requirements = [];
    for(var i in task.task_array) {
      var taskArg = task.task_array[i];
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
        var auto_task_type = tasks.hasOwnProperty(taskArg) && 'task' || data && data.hasOwnProperty(taskArg) && 'data' || context && context.hasOwnProperty(taskArg) && typeof context[taskArg] != 'function' && 'context';
        if(taskArg == taskName) auto_task_type = null;
        if(auto_task_type) {
          if(fn) args.push(taskArgParts);                                   //there's already a fn, so assume that 'foo.bar.baz' must be a parameter to fn.
          else if(taskArgParts.length > 1) {
            fn = { name: taskArgParts.pop(), receiverName: taskArgParts };  //there's no fn yet, so assume that 'foo.bar.baz' means baz must be a function to execute on foo.bar
            fnIndex = i;              
          }
          if(auto_task_type == 'task') task.task_requirements.push(taskArg);
          else if(auto_task_type == 'data' || auto_task_type == 'context') task.data_requirements.push(taskArg);
          //else if(auto_task_type == 'context') task.context_requirements.push(taskArg);
          autoTask.push(taskArg);
        } else throw new FlowTaskError(taskName, "Unknown string '" + taskArg + "' must be either the name of a task or the name of data");
      } else throw new FlowTaskError(taskName, "Unknown symbol at index '" + i + "' must be either the name of a task, the name of data, or be the name of a function on the result of a task or data");
    }
    if(!fn) throw new FlowTaskError(taskName, "Function required.");
  } else {
    throw new FlowTaskError(taskName, "Invalid flow type. Must be function, subFlow, or array.");
  }

  return { fn: fn, args: args, autoTask: autoTask, task: task, isSync: (task instanceof SyncTask) };
}

Workflow.prototype.executeTaskPlan = function executeTaskPlan(taskPlan, taskName){
  var self = this;
  var fn = taskPlan.fn;
  var args = taskPlan.args;
  var autoTask = taskPlan.autoTask;
  var task = taskPlan.task;

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
      var sub_workflow = new Workflow(newData, fn.tasks, cb);
      sub_workflow.parent = self;
      sub_workflow.execute(fn.receiverName);
    });
  } else {
    autoTask.push(function(callback, results){
      var cb = function(err, result){
        if(err && err.name == "ArgumentNullError" && self.tasks[err.argumentName]) err.message = "Not Found: " + self.tasks[err.argumentName].toString(results)
        if(err) return callback(err);
        if(arguments.length > 2) result = Array.prototype.slice.call(arguments, 1);
        if(task) return Task.complete.call(task, result, results, callback);
        else callback(null, result);
      };

      var fnArgs;
      try {
        //we will generate the list of args to apply to the fn.
        fnArgs = args.map(function(arg){ 
          return evalMessages(results, arg, taskName);         
        });
      } catch(e) { 
        if(e.name == "FlowTaskArgumentNullError") {
          e = new errors.ArgumentNull(e.argumentName);
          e.message = "Not Found: " + self.tasks[taskName].toString(results, e.argumentName);
        }
        return callback(e); 
      }
      if(!taskPlan.isSync) fnArgs.push(cb);

      var receiver;
      if(typeof fn != 'function') {
        var fnName = fn.name;
        var receiverName = fn.receiverName;
        try {
          receiver = evalMessages(results, receiverName, taskName);
        } catch(e) { 
          if(e.name == "FlowTaskArgumentNullError") e.message = "Not Found: " + self.tasks[taskName].toString(results, e.argumentName);
          return callback(e); 
        }
        if(!receiver) {
          var err = new errors.ArgumentNull(receiverName.join('.'));
          if(self.tasks[receiverName[0]]) err.message = "Not Found: " + self.tasks[receiverName[0]].toString(results, err.argumentName);
          return callback(err)
        }
        fn = receiver[fnName];
        if(!fn) throw new FlowTaskError(taskName, "Unknown symbol '" + fnName + "' must be either the name of a task, the name of data, or the name of a function on '" + receiverName + "'");
      }

      try {
        var return_value = fn.apply(receiver, fnArgs);
        if(taskPlan.isSync) cb(null, return_value);
      } catch(e){
        throw new FlowTaskError(taskName, "Error during execution of function.", e);
      }
    });
  }

  return autoTask;
}

var evalMessages = function evalMessages(receiver, messages, taskName){
  if(Array.isArray(messages)) {
    for(var i in messages) {
      if(receiver === undefined) {
        var receiverName = messages.slice(1,i).join('.');
        var err = new FlowTaskArgumentNullError(taskName, messages[i-1], messages[i]);
        err.argumentName = receiverName;
        throw err;
      }
      receiver = receiver[messages[i]];
    }
    return receiver;
  } else return receiver[messages];
}

var scanForPrereqs = function scanForPrereqs(tasks, allTasks) {
  var prereqs = {};
  for(var taskName in tasks) {
    var taskArgs = tasks[taskName];
    if(taskArgs instanceof SubFlow){
      us.extend(prereqs, scanForPrereqs(taskArgs.tasks, us.extend({}, allTasks, tasks)));
    } else if(taskArgs instanceof Task){
      for(var i in taskArgs.task_array) {
        var taskArg = taskArgs.task_array[i];
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
  if(typeof tasks == 'object') {
    for(var name in tasks) if(Array.isArray(tasks[name])) tasks[name] = new AsyncTask(tasks[name]);
  }
};
module.exports.flow.subFlow = function(dataName, tasks) {
  return new SubFlow(dataName, tasks);
};

module.exports.flow.asyncTask = function(task_array) {
  if(!(task_array instanceof Array)) task_array = us.values(arguments);
  return new AsyncTask(task_array);
}

module.exports.flow.syncTask = function(task_array) {
  if(!(task_array instanceof Array)) task_array = us.values(arguments);
  return new SyncTask(task_array);
}


