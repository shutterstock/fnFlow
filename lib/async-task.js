var util = require('util');
var Task = require('./task');

var AsyncTask = module.exports = function(name, fn, args){
  AsyncTask.super_.call(this, name, fn, args);
}
util.inherits(AsyncTask, Task);