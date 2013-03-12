var async = require('async');
var us = require('underscore');

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
  var fn;
  var args = [];
  var autoTask = [];

  if(typeof taskArgs == 'function') {
    fn = taskArgs;
  } else if(!Array.isArray(taskArgs)) throw new Error("Invalid flow type for \"" + taskName + "\". Must be function or array: " + taskArgs);
  else {
    for(var i in taskArgs) {
      var taskArg = taskArgs[i];
      if(typeof taskArg == 'function') {
        if(fn) throw new Error("Flow task \"" + taskName + "\" has more than one function specified.");
        fn = taskArg;
      } else if(tasks.hasOwnProperty(taskArg) || data.hasOwnProperty(taskArg)) {
        if(fn) args.push(taskArg);
        autoTask.push(taskArg);
      } else {
        if(fn) throw new Error("Flow task \"" + taskName + "\" has more than one function specified.");
        fn = { name: taskArg, receiver: taskArgs[i - 1] };
        if(!fn.receiver) throw new Error("Flow task \"" + taskName + "\" marked for instance execution of function \"" + taskArg + "\", but no receiver was specified.");
      }
    }
    if(!fn) throw new Error("Function required for flow call of \"" + taskName + "\".");
  }

  autoTask.push(function(cb, results){
    var fnArgs = us.map(args, function(arg){ return results[arg]; });
    fnArgs.push(cb);

    try {
      if(typeof fn == 'function') fn.apply(null, fnArgs);
      else {
        var receiver = results[fn.receiver]
        receiver[fn.name].apply(receiver, fnArgs);
      }
    } catch(e){
      console.log('err')
      var err = new Error("Flow error in " + taskName);
      err.stack = err.stack + "\n" + e.stack;
      throw err;
    }
  });

  return autoTask;
}

