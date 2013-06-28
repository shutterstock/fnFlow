var util = require('util');
var us = require('underscore');
var errors = require('errors');
var EventEmitter = require('events').EventEmitter;

//I will expose the Task class eventually, but first I want to be sure that this is a good interface.
var Task = module.exports.Task = function(task_array){
  this.task_array = task_array;
  this.emitter = new EventEmitter();
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

Task.prototype._getRequirements = function getRequirements(requirements) {
  var self = this;
  if(this.data_requirements) this.data_requirements.forEach(function(req){ requirements.data[req] = true; });
  if(this.context_requirements) this.context_requirements.forEach(function(req){ requirements.context[req] = true; });
  var task_requirements = this.task_requirements;
  if(task_requirements && task_requirements.length) {
    for(var i in task_requirements) {
      var req = task_requirements[i];
      requirements.tasks[req] = true;
      var task = this.workflow.tasks[req];
      if(task) task._getRequirements(requirements);
    }    
  }
  var contextName = this.workflow.contextName;
  var parent_wf = this.workflow.parent;
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

var AsyncTask = module.exports.AsyncTask = function(task_array){
  AsyncTask.super_.call(this, task_array);
}
util.inherits(AsyncTask, Task);

var SyncTask = module.exports.SyncTask = function(task_array){
  SyncTask.super_.call(this, task_array);
}
util.inherits(SyncTask, Task);


