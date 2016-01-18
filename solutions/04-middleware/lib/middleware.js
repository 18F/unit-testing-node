/* jshint node: true */

'use strict';

var Rule = require('./rule');
var SlackClient = require('./slack-client');

module.exports = Middleware;

function Middleware(config, slackClient, githubClient, logger) {
  this.rules = config.rules.map(function(rule) {
    return new Rule(rule);
  });
  this.successReaction = config.successReaction;
  this.slackClient = slackClient;
  this.githubClient = githubClient;
  this.logger = logger;
}

Middleware.prototype.execute = function(context, next, done) {
  var response = context.response,
      message = response.message.rawMessage,
      rule = this.findMatchingRule(message),
      msgId,
      finish;

  if (!rule) {
    return next(done);
  }

  msgId = messageId(message);
  finish = function() {
    next(done);
  };

  return getReactions(this, msgId, message)
    .then(fileGitHubIssue(this, msgId, rule.githubRepository))
    .then(addSuccessReaction(this, msgId, message))
    .then(handleSuccess(finish))
    .catch(handleFailure(this, rule.githubRepository, finish));
};

Middleware.prototype.findMatchingRule = function(message) {
  var slackClient = this.slackClient;

  if (message && message.type === SlackClient.REACTION_ADDED &&
      message.item.type === 'message') {
    return this.rules.find(function(rule) {
      return rule.match(message, slackClient);
    });
  }
};

function messageId(message) {
  return message.item.channel + ':' + message.item.ts;
}

function getReactions(middleware, msgId, message) {
  var domain = middleware.slackClient.getTeamDomain(),
      channelName = middleware.slackClient.getChannelName(message.item.channel),
      timestamp = message.item.ts,
      permalink = 'https://' + domain + '.slack.com/archives/' +
        channelName + '/p' + timestamp.replace('.', '');

  middleware.logger(msgId, 'getting reactions for ' + permalink);
  return middleware.slackClient.getReactions(message.item.channel, timestamp);
}

function fileGitHubIssue(/* middleware, msgId, rule.githubRepository */) {
}

function addSuccessReaction(/* middleware, msgId, message */) {
}

function handleSuccess(/* finish */) {
}

function handleFailure(/* middleware, rule.githubRepository, finish */) {
}
