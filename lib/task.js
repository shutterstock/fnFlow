var util = require('util');
var us = require('underscore');
var errors = require('common-errors');
var EventEmitter = require('events').EventEmitter;
var FlowTaskError = require('./flowTaskError');
var FlowTaskArgumentNullError = require('./flowTaskArgumentNullError');

var Task = module.exports = function(name, fn, args){
  if(!name) throw new errors.ArgumentNull('name');
  if(!fn) throw new errors.ArgumentNull('fn');
  if(!/^(string|function)$/.test(typeof fn)) throw new TypeError('Task fn must be a string or a function');
  for(var i=0; i<args.length; i++) if(typeof args[i] != 'string') throw new TypeError('args must contain only string names of tasks or data.');
  this.name = name, this.fn = fn, this.args = args;
  this.emitter = new EventEmitter();
  this._explicit_reqs = [];
  this._data_requirements = [];
  this._task_requirements = [];
}

Task.prototype.onComplete = function onComplete(listener){
  if(!this.emitter) {
    this.emitter = new EventEmitter();
  }
  this.emitter.on.call(this.emitter, 'complete', listener);
}

Task.prototype.assertExists = function assertExists(){
  var self = this;
  this.onComplete(function(result, results){
    var err;
    if(result === null || result === undefined) {
      err = new errors.ArgumentNull(self.name);
      err.message = 'Not Found: ' + self.toString(results);
      throw err;
    }
  });
  return this;
}

Task.prototype.requires = function requires(task_names) {
  if(!task_names) throw new errors.ArgumentNull('task_names');
  if(typeof task_names == 'string') this._explicit_reqs.push(task_names);
  else if(task_names instanceof Array) Array.prototype.push.apply(this._explicit_reqs, task_names);
  return this;
}

Task.prototype.toString = function toString(results, display_name){
  var self = this;
  var str = '"' + (display_name || self.name) + '"';
  var reqs = this._getRequirements({tasks: {}, data: {}, context: {}});
  var task_requirements = Object.keys(reqs.tasks);
  task_requirements.forEach(function(req, i){
    if(i == 0) str += ' for ';
    else if(i == task_requirements.length - 1) str += ' and ';
    else str += ', ';
    str += req;
  });
  var data_requirements = Object.keys(reqs.data).filter(function(req){ return !reqs.tasks[req]; });
  for(var i in data_requirements) {
    var req = data_requirements[i];
    var value = results[req];
    if(value === undefined) value = 'undefined';
    else if(typeof(value) == 'object') value = JSON.stringify(value.toString());
    else value = JSON.stringify(results[req]);
    if(i == 0) str += ' with ';
    else if(i == data_requirements.length - 1) str += ' and ';
    else str += ', ';
    str += req + ' ' + value;
  }
  return str;
}

Task.prototype._createPlan = function createPlan(data) {
  var self = this, task = this;
  var flow = this.flow;
  if(this._plan) return this._plan;
  var plan = { args: [], auto_task: [] };
  var task_args = task.args;
  if(typeof task.fn == 'string') task_args.unshift(task.fn);
  else plan.fn = task.fn;

  for(var i=0; i<task_args.length; i++){
    var task_arg = (task_args[i] || '').toString();
    var task_arg_parts = task_arg.split('.');
    task_arg = task_arg_parts[0];
    var auto_task_type = flow.tasks.hasOwnProperty(task_arg) && 'task' || 
      flow.flows.hasOwnProperty(task_arg) && 'flow' || 
      data && data.hasOwnProperty(task_arg) && 'data' || 
      flow.context_name && 'context';  //if it's not a task, flow, or data, it must be a context property.
    if(task_arg == self.name) auto_task_type = null;
    if(auto_task_type) {
      if(auto_task_type == 'task' || auto_task_type == 'flow') task._task_requirements.push(task_arg);
      else if(auto_task_type == 'data') task._data_requirements.push(task_arg);
      if(plan.fn) plan.args.push(task_arg_parts);  //there's already a fn, so task.fn must be a function, and this task_arg must be an actual arg.
      else plan.fn = { name: task_arg_parts.pop(), receiverName: task_arg_parts };  //there's no fn yet, so assume that 'foo.bar.baz' means baz must be a function to execute on foo.bar
      plan.auto_task.push(task_arg);
    } else throw new FlowTaskError(task.name, "Unknown string '" + task_arg + "' must be either the name of a task or the name of data");
  }
  Array.prototype.push.apply(plan.auto_task, this._explicit_reqs);

  plan.auto_task.push(function(callback, results){
    var cb = function(err, result){
      if(err && err.name == "ArgumentNullError" && flow.tasks[err.argumentName]) err.message = "Not Found: " + flow.tasks[err.argumentName].toString(results)
      if(err) return callback(err);
      if(arguments.length > 2) result = Array.prototype.slice.call(arguments, 1);
      return Task.complete.call(task, result, results, callback);
    };

    var fnArgs;
    try {
      //we will generate the list of args to apply to the fn.
      fnArgs = plan.args.map(function(arg){ 
        return evalMessages(results, arg, self.name);         
      });
    } catch(e) { 
      if(e.name == "FlowTaskArgumentNullError") {
        e = new errors.ArgumentNull(e.argumentName);
        e.message = "Not Found: " + flow.tasks[self.name].toString(results, e.argumentName);
      }
      return callback(e); 
    }
    if(!self.is_sync) fnArgs.push(cb);

    var fn = plan.fn;
    var receiver;
    if(typeof plan.fn != 'function') {
      var fnName = plan.fn.name;
      var receiverName = plan.fn.receiverName;
      try {
        receiver = evalMessages(results, receiverName, self.name);
      } catch(e) { 
        if(e.name == "FlowTaskArgumentNullError") e.message = "Not Found: " + self.tasks[self.name].toString(results, e.argumentName);
        return callback(e); 
      }
      if(!receiver) {
        var err = new errors.ArgumentNull(receiverName.join('.'));
        if(flow.tasks[receiverName[0]]) err.message = "Not Found: " + flow.tasks[receiverName[0]].toString(results, err.argumentName);
        return callback(err)
      }
      fn = receiver[fnName];
      if(!fn) return callback(new FlowTaskError(self.name, "Unknown symbol '" + fnName + "' must be either the name of a task, the name of data, or the name of a function on '" + receiverName + "'"));
      if(typeof fn != 'function') return callback(new FlowTaskError(self.name, "Not a function: " + (receiverName.length ? (receiverName.join('.') + ".") : '') + fnName));
    }

    try {
      var return_value = fn.apply(receiver, fnArgs);
      if(self.is_sync) cb(null, return_value);
    } catch(e){
      throw new FlowTaskError(self.name, "Error during execution of function.", e);
    }
  });

  return this._plan = plan;
}

Task.prototype._getRequirements = function getRequirements(requirements) {
  var self = this;
  if(this._data_requirements) this._data_requirements.forEach(function(req){ requirements.data[req] = true; });
  if(this._context_requirements) this._context_requirements.forEach(function(req){ requirements.context[req] = true; });
  var task_requirements = this._task_requirements;
  if(task_requirements && task_requirements.length) {
    for(var i in task_requirements) {
      var req = task_requirements[i];
      requirements.tasks[req] = true;
      var task = this.flow.tasks[req];
      if(task) task._getRequirements(requirements);
    }    
  }
  var contextName = this.flow.contextName;
  var parent_wf = this.flow.parent;
  if(contextName && parent_wf && parent_wf.tasks[contextName]) {
    requirements.tasks[contextName] = true;
    parent_wf.tasks[contextName]._getRequirements(requirements);
  }
  return requirements;
}


Task.complete = function(result, results, callback){
  var err;
  try {
    if(this.emitter) this.emitter.emit('complete', result, results);
  } catch(e) { err = e; }
  callback(err, result);
}

var evalMessages = function evalMessages(receiver, messages, taskName){
  if(Array.isArray(messages)) {
    for(var i in messages) {
      if(receiver === undefined || receiver === null) {
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





