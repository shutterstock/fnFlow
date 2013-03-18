var async = require('async');
var us = require('underscore');
var FlowError = require('./flowError');
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

    if (data instanceof Array) {
      return async.map(data, function (dataItem, cb) {flowGo(dataItem, tasks, cb)}, callback);
    } else {
      return flowGo(data, tasks, callback);
    }
  }
}

var flowGo = function flowGo(data, tasks, callback) {
  var newTasks;
  if(data) newTasks = us.object(Object.keys(data), us.map(Object.keys(data), function(key){ return function(cb){ cb(null, data[key]); } }))
  if(tasks) us.extend(newTasks, us.object(Object.keys(tasks), us.map(Object.keys(tasks), function(key){ return flowCall(tasks[key], key, tasks, data); } )));
  return async.auto(newTasks, callback);
}

var flowCall = function flowCall(taskArgs, taskName, tasks, data) {
  var fn;             //function to call within each async.auto task (does the work).
  var fnIndex;        //index where fn was found.
  var args = [];      //arguments to pass to each function during task execution
  var autoTask = [];  //array value for each async.auto task

  if(typeof taskArgs == 'function') {
    fn = taskArgs;
  } else if(!Array.isArray(taskArgs)) throw new FlowTaskError(taskName, "Invalid flow type. Must be function or array.");
  else {
    for(var i in taskArgs) {
      var taskArg = taskArgs[i];
      if(typeof taskArg == 'function') {
        if(fn) throw new FlowTaskError(taskName, "More than one function specified (at index " + fnIndex + " and " + i + ").");
        fn = taskArg;
        fnIndex = i;
      } else if((tasks.hasOwnProperty(taskArg) || data.hasOwnProperty(taskArg)) && taskArg != taskName) {
        if(fn) args.push(taskArg);
        autoTask.push(taskArg);
      } else {
        if(fn) throw new FlowTaskError(taskName, "More than one function specified (at index " + fnIndex + " and " + i + ").");
        fn = { name: taskArg, receiverName: taskArgs[i - 1] };
        fnIndex = i;
        if(!fn.receiverName) throw new FlowTaskError(taskName, "Unknown symbol at index '" + i + "' must be either the name of a task, the name of data, or be the name of a function on the result of a task or data");
      }
    }
    if(!fn) throw new FlowTaskError(taskName, "Function required.");
  }

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

  return autoTask;
}
