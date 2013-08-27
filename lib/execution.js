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
}

Execution.launch = function launch(flow, data, callback) {
  if(!flow) return new errors.ArgumentNull('flow');
  if(!data) return new errors.ArgumentNull('data');

  if(data instanceof Array) {
    var execs = data.map(function(data, cb){ return new Execution(flow, data); });
    return async.map(execs, function(e, cb){ e.exec(cb); }, callback);
  } else {
    return new Execution(flow, data).exec(callback);
  }
}

Execution.prototype.exec = function exec(callback) {
  var self = this;
  var flow = this.flow, data = this.data;
  var data_keys = Object.keys(data);
  if(!flow.parent) flow.data_keys = us.extend(flow.data_keys || {}, data);

  var plan = flow._createPlan(data);
  var new_tasks = plan.auto;
  if(data) new_tasks = us.extend({}, new_tasks, us.object(data_keys, us.map(data_keys, function(key){ return function(cb){ cb(null, data[key]); } })));

  return async.auto(new_tasks, function(err, results){
    if(flow.parent) callback(err, us.pick(results, Object.keys(flow.tasks).concat(Object.keys(flow.flows))));
    else callback(err, results);
  });
}

