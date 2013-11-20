var us = require('underscore');
var errors = require('common-errors');

var Execution = require('./execution');
var Task = require('./task');
var AsyncTask = require('./async-task');
var SyncTask = require('./sync-task');
var FlowTaskError = require('./flowTaskError');
var FlowTaskArgumentNullError = require('./flowTaskArgumentNullError');

var Flow = module.exports.Flow = function Flow(context_name, tasks) {
  var self = this;
  var args = arguments;
  self._initialize = function _initialize(){
    if(self.parent) {
      if(!context_name) throw new errors.ArgumentNull('context_name');
    } else {
      if(args.length == 1) tasks = context_name, context_name = undefined;
    }

    self.context_name = context_name; 
    self.tasks = us.extend(self.tasks, tasks || {});

    self._initialize_tasks();
  }

  self.tasks = {};
  self.flows = {};
  self._explicit_reqs = [];
}

us.extend(Flow, {
  Task: AsyncTask,
  Fn: SyncTask
});

Flow.prototype.execute = function execute(data, callback) {
  if(arguments.length == 1) {
    callback = data, data = {};
  }
  if(!callback) throw new errors.ArgumentNull('callback');
  return Execution.launch(this, data, callback);
}

Flow.prototype._createPlan = function _createPlan(data) {
  if(this._plan) return this._plan;
  var self = this;
  var plan = { auto: {}, auto_task: undefined, prereqs: {} };

  this._initialize();

  var planTasks = function(o){
    var keys = Object.keys(o);
    keys.forEach(function(item_name){
      var item = o[item_name];
      if(item._createPlan) {
        var item_plan = (item instanceof Flow) ? item._createPlan(us.extend({}, data, us.omit(self.tasks, item.name))) : item._createPlan(data);
        var item_prereqs = item_plan.auto_task.slice(0, item_plan.auto_task.length - 1);
        for(var i=0; i<item_prereqs.length; i++) {
          var item_prereq = item_prereqs[i];
          var is_context = !(data && data.hasOwnProperty(item_prereq) || self.tasks.hasOwnProperty(item_prereq) || self.flows.hasOwnProperty(item_prereq));
          if(data && data.hasOwnProperty(item_prereq)) plan.prereqs[item_prereq] = true;
          if(is_context && self.context_name && item_prereq != self.context_name) {
            plan.auto[item_prereq] = plan.auto[item_prereq] || (function(item_prereq){ 
              return [self.context_name, function(cb, results){ 
                var context = results[self.context_name]; 
                if(!context) return cb(new errors.ArgumentNull("Flow context \"" + self.context_name + "\""));
                cb(null, context[item_prereq]);
              }];
            })(item_prereq);
          }
        }
        plan.auto[item_name] = item_plan.auto_task;
      } 
    });
  };

  if(!Object.keys(self.tasks).length && !Object.keys(self.flows).length) throw Error("No tasks given for Flow.");

  if(self.tasks) planTasks(self.tasks);
  if(self.flows) planTasks(self.flows);
  if(self.context_name) {
    var context_prereq = self.context_name.split('.')[0];
    if(!(data && data.hasOwnProperty(context_prereq))) {
      throw new FlowTaskError(self.name, "Subflow data '" + context_prereq + "' does not exist. Provide the name of a flow, task or data from the parent flow.  Possible values include: " + Object.keys(data).join(', '));
    }
    plan.prereqs[context_prereq] = true;
  }

  plan.auto_task = Object.keys(plan.prereqs);
  Array.prototype.push.apply(plan.auto_task, this._explicit_reqs);
  plan.auto_task.push(function(cb, results){
    var data;
    var context = self.parent && self.context_name ? results[self.context_name] : null;
    if(context === null || context === undefined) {
      return cb(new FlowTaskError(self.name, "Result of '" + self.context_name + "' returned no data. Could not start SubFlow."));
    } else if(Array.isArray(context)){
      data = context.map(function(context_item){ 
        var data_item = us.extend({}, results);
        data_item[self.context_name] = context_item;
        return data_item;
      });
    } else {
      data = us.extend({}, results);
      data[self.context_name] = context;
    }
    Execution.launch(self, data, cb);
  });

  return this._plan = plan;
}

Flow.prototype._initialize_tasks = function _initialize_tasks() {
  var task_names = Object.keys(this.tasks);
  for(var i=0; i<task_names.length; i++) {
    var task_name = task_names[i];
    var task = this.tasks[task_name];
    if(task instanceof Task) {
      task.flow = this;
    } else if(task instanceof Flow) {
      task.parent = this;
      this.flows[task_name] = task;
    } else {
      throw new TypeError('task ' + task_name + ' must be a Task or Flow');
    }
    if(task.name && task.name != task_name) throw new Error("Task " + task_name + " already named " + task.name);
    task.name = task_name;
  }
}

Flow.prototype.requires = Task.prototype.requires;
