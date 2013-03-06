var async = require('async');
var us = require('underscore');

module.exports = {
  flow: function flow(tasks, data, callback){
    if(typeof(data) == 'function') {
      callback = data;
      data = null;
    }

    var newTasks;
    if(data) newTasks = us.object(Object.keys(data), us.map(Object.keys(data), function(key){ return function(cb){ console.log('completed data', key); cb(null, data[key]); } }))
    if(tasks) us.extend(newTasks, us.object(Object.keys(tasks), us.map(Object.keys(tasks), function(key){ console.log('completed task', key); return flowCall(tasks[key], key); } )));

    return async.auto(newTasks, callback);
  }
}


var flowCall = function flowCall(taskArgs, taskName) {
  var fn;

  if(typeof taskArgs == 'function') {
    fn = taskArgs;
    taskArgs = [];
  } else if(!Array.isArray(taskArgs)) throw new Error("Invalid flow type. Must be function or array: " + taskArgs);
  else {
    fn = (typeof taskArgs[0] == 'function') ? taskArgs.shift() : taskArgs.pop();
    if(typeof fn != 'function') throw new Error("Function required for flow call.");    
  }

  taskArgs.push(function(cb, results){
    var args = us.map(taskArgs.slice(0, taskArgs.length -1), function(arg){ return results[arg]; });
    args.push(cb);
    try {
      fn.apply(null, args);
    } catch(e){
      console.log('err')
      var err = new Error("Flow error in " + taskName);
      err.stack = err.stack + "\n" + e.stack;
      throw err;
    }
  });

  return taskArgs;
}

