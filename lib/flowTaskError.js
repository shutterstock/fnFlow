var util = require('util');

function FlowTaskError(taskName, message, innerError) {
  this.taskName = taskName;
  this.message = "Flow error in '" + taskName + "': " + message;
  this.name = "FlowTaskError";
  this.innerError = innerError;
  Error.captureStackTrace(this, FlowTaskError);
  if(innerError) this.stack = this.stack + "\n" + innerError.stack;

  return this;
}
util.inherits(FlowTaskError, Error);

module.exports = FlowTaskError;
