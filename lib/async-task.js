var util = require('util');
var Task = require('./task');

var AsyncTask = module.exports = function(fn, args){
  AsyncTask.super_.apply(this, arguments);
}
util.inherits(AsyncTask, Task);