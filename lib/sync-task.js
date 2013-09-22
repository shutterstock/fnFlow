var util = require('util');
var Task = require('./task');

var SyncTask = module.exports = function(fn, args){
  SyncTask.super_.apply(this, arguments);
  this.is_sync = true;
}
util.inherits(SyncTask, Task);