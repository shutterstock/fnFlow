var util = require('util');

function FlowTaskArgumentNullError(taskName, receiverName, functionName) {
  this.taskName = taskName;
  var message = "Cannot call function '" + functionName + "' on null/undefined '" + receiverName + "'";
  this.message = "Flow error in '" + taskName + "': " + message;
  this.name = "FlowTaskArgumentNullError";
  Error.captureStackTrace(this, FlowTaskArgumentNullError);

  return this;
}
util.inherits(FlowTaskArgumentNullError, Error);

module.exports = FlowTaskArgumentNullError;
