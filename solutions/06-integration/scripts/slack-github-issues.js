// jshint node: true
//
// Description:
//   Uses the Slack Real Time Messaging API to file GitHub issues
//
// Configuration:
//   HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH

'use strict';

var Config = require('../lib/config');
var SlackClient = require('../lib/slack-client');
var GitHubClient = require('../lib/github-client');
var Logger = require('../lib/logger');
var Middleware = require('../lib/middleware');

module.exports = function(robot) {
  var logger = new Logger(robot.logger),
      config = new Config(null, logger),
      impl = new Middleware(
        config,
        new SlackClient(robot.adapter.client, config),
        new GitHubClient(config),
        logger),
      middleware;

  middleware = function(context, next, done) {
    impl.execute(context, next, done);
  };
  middleware.impl = impl;
  robot.receiveMiddleware(middleware);
  impl.logger.info(null, 'registered receiveMiddleware');
};
