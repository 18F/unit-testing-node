/* jshint node: true */

'use strict';

module.exports = Rule;

function Rule(configRule) {
  for (var property in configRule) {
    if (configRule.hasOwnProperty(property)) {
      this[property] = configRule[property];
    }
  }
}

Rule.prototype.match = function(message, slackClient) {
  return (this.reactionMatches(message) &&
    this.channelMatches(message, slackClient));
};

Rule.prototype.reactionMatches = function() {
};

Rule.prototype.channelMatches = function() {
};
