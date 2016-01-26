/* jshint node: true */

'use strict';

module.exports = Logger;

function Logger(logger) {
  this.logger = logger;
}

Logger.prototype.info = function() {
};
