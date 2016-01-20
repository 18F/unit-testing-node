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
  this.logger.info(msgId, 'matches rule:', rule);
  finish = handleFinish(msgId, this.logger, response, next, done);

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

Middleware.prototype.parseMetadata = function(message) {
  var result = {
    channel: this.slackClient.getChannelName(message.channel),
    timestamp: message.message.ts,
    url: message.message.permalink
  };
  result.date = new Date(result.timestamp * 1000);
  result.title = 'Update from #' + result.channel +
    ' at ' + result.date.toUTCString();
  return result;
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

  middleware.logger.info(msgId, 'getting reactions for', permalink);
  return middleware.slackClient.getReactions(message.item.channel, timestamp);
}

function fileGitHubIssue(middleware, msgId, githubRepository) {
  return function(message) {
    var metadata, permalink = message.message.permalink;

    metadata = middleware.parseMetadata(message);
    middleware.logger.info(msgId, 'making GitHub request for', permalink);
    return middleware.githubClient.fileNewIssue(metadata, githubRepository);
  };
}

function addSuccessReaction(middleware, msgId, message) {
  return function(issueUrl) {
    var channel = message.item.channel,
        timestamp = message.item.ts,
        reaction = middleware.slackClient.successReaction,
        resolve, reject;

    resolve = function() {
      return Promise.resolve(issueUrl);
    };

    reject = function(err) {
      return Promise.reject(new Error('created ' + issueUrl +
        ' but failed to add ' + reaction + ': ' + err.message));
    };

    middleware.logger.info(msgId, 'adding', reaction);
    return middleware.slackClient.addSuccessReaction(channel, timestamp)
      .then(resolve, reject);
  };
}

function handleSuccess(finish) {
  return function(issueUrl) {
    finish('created: ' + issueUrl);
    return Promise.resolve(issueUrl);
  };
}

function handleFailure(middleware, githubRepository, finish) {
  return function(err) {
    var message;

    if (err.message.startsWith('created ')) {
      message = err.message;
    } else {
      message = 'failed to create a GitHub issue in ' +
        middleware.githubClient.user + '/' + githubRepository + ': ' +
        err.message;
    }
    finish(message);
    return Promise.reject(new Error(message));
  };
}

function handleFinish(messageId, logger, response, next, done) {
  return function(message) {
    logger.info(messageId, message);
    response.reply(message);
    next(done);
  };
}
