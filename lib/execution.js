var us = require('underscore');
var async = require('async');
var errors = require('common-errors');
var FlowTaskError = require('./flowTaskError');

var Execution = module.exports = function Execution(flow, data) {
  if(!flow) throw new errors.ArgumentNull('flow');
  if(!data) throw new errors.ArgumentNull('data');
  this.flow = flow;
  this.data = data;
  var context = this.context = flow.parent ? data[flow.context_name] : null;

  flow.data_keys = us.extend(flow.data_keys || {}, data);
  flow.context_keys = us.extend(flow.context_keys || {}, context);
}

Execution.launch = function launch(flow, callback) {
  if(!flow) return new errors.ArgumentNull('flow');
  // if(flow.parent && !flow.context_name) return callback(new FlowTaskError(flow.parent_task_name, "Sub-flows must specify the name of one of the parent flow's tasks."));

  if(flow.data instanceof Array) {
    var execs = flow.data.map(function(data, cb){ return new Execution(flow, data); });
    return async.map(execs, function(e, cb){ e.exec(cb); }, callback);
  } else {
    return new Execution(flow, flow.data).exec(callback);
  }
}

Execution.prototype.exec = function exec(callback) {
  var self = this;
  var flow = this.flow, data = this.data;
  var context = this.context = flow.parent ? data[flow.context_name] : null;
  var data_keys = Object.keys(flow.data_keys), context_keys = Object.keys(flow.context_keys), task_keys = Object.keys(flow.tasks), flow_keys = Object.keys(flow.flows);

  var new_tasks;
  if(data) new_tasks = us.object(data_keys, us.map(data_keys, function(key){ return function(cb){ cb(null, data[key]); } }))
  if(context) us.extend(new_tasks, us.object(context_keys, us.map(context_keys, function(key){ return function(cb){ cb(null, context[key]); } })));
  if(flow.tasks) us.extend(new_tasks, us.object(task_keys, us.map(task_keys, function(task_name){
    var task = flow.tasks[task_name];
    var plan = task._createPlan();
    return plan.auto_task;
    // return this.execPlan(task); 
  } )));
  if(flow.flows) us.extend(new_tasks, us.object(flow_keys, us.map(flow_keys, function(flow_name){
    var flow = flow.flows[flow_name];
    var plan = flow._createPlan();
    return plan.auto_task;
  } )));

  return async.auto(new_tasks, function(err, results){
    if(flow.parent) callback(err, us.pick(results, flow.task_keys));
    else callback(err, results);
  });
}

Execution.prototype.execPlan = function execPlan(task) {

}

