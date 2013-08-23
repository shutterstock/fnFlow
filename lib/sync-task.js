var util = require('util');
var Task = require('./task');

var SyncTask = module.exports = function(name, fn, args){
  SyncTask.super_.call(this, name, fn, args);
  this.is_sync = true;
}
util.inherits(SyncTask, Task);