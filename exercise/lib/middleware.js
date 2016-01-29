'use strict';

module.exports = Middleware;

function Middleware(config, slackClient, githubClient) {
  this.rules = config.rules;
  this.successReaction = config.successReaction;
  this.slackClient = slackClient;
  this.githubClient = githubClient;
}

Middleware.prototype.execute = function(/* context, next, done */) {
};
