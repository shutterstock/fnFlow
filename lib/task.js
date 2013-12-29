var util = require('util');
var us = require('underscore');
var errors = require('common-errors');
var EventEmitter = require('events').EventEmitter;
var FlowTaskError = require('./flowTaskError');
var FlowTaskArgumentNullError = require('./flowTaskArgumentNullError');

var Task = module.exports = function(fn, args){
  if(!fn) throw new errors.ArgumentNull('fn');
  if(!/^(string|function)$/.test(typeof fn)) throw new TypeError('Task fn must be a string or a function');
  args = Array.prototype.slice.call(arguments, 1);
  for(var i=0; i<args.length; i++) if(typeof args[i] != 'string') throw new TypeError('args must contain only string names of tasks or data.');
  this.fn = fn, this.args = args;
  this.emitter = new EventEmitter();
  this._explicit_reqs = [];
}

Task.prototype.onComplete = function onComplete(listener){
  this.emitter.on.call(this.emitter, 'complete', listener);
}

Task.prototype.defaultTo = function(value) {
  this.onComplete(function(result, results){
    if(result.value === null || result.value === undefined) result.value = value;
  });
  return this;
}

Task.prototype.assertExists = function assertExists(){
  var self = this;
  this.onComplete(function(result, results){
    var err;
    if(result.value === null || result.value === undefined) {
      err = new errors.ArgumentNull(self.name);
      err.message = 'Not Found: ' + self.toString(results.value);
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
  var data_requirements = Object.keys(this._getRequirements());
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
    else if(auto_task_type == 'context' && task_arg != flow.context_name) task_arg_parts.unshift(task_arg = flow.context_name);
    if(auto_task_type) {
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

Task.prototype._getRequirements = function getRequirements() {
  var self = this;
  var tasks;
  var root_flow = self.flow;
  tasks = us.extend({}, root_flow.tasks, root_flow.flows);
  while(root_flow.parent) {
    root_flow = root_flow.parent;
    us.extend(tasks, root_flow.tasks, root_flow.flows);
  }

  var data_requirements = {};
  var plan = self._createPlan();
  var prereqs_array = [plan.auto_task];
  for(var i=0; i<prereqs_array.length; i++) {
    var prereqs = prereqs_array[i];
    for(var j=0; j<prereqs.length-1; j++) {
      var prereq = prereqs[j];
      if(!tasks.hasOwnProperty(prereq)) data_requirements[prereq] = true;
      else prereqs_array.push(tasks[prereq]._createPlan().auto_task);
    }      
  }
  return data_requirements;
}


Task.complete = function(result, results, callback){
  result = { value: result };
  results = { value: results };
  var err;
  try {
    if(this.emitter) {
      this.emitter.emit('complete', result, results);
    }
  } catch(e) { err = e; }
  callback(err, result.value);
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





