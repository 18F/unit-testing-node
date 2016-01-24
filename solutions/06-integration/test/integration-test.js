/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Helper = require('hubot-test-helper');
var scriptHelper = new Helper('../scripts/slack-github-issues.js');
var LogHelper = require('./helpers/log-helper');
var ApiStubServer = require('./helpers/api-stub-server.js');
var helpers = require('./helpers');
var temp = require('temp');
var fs = require('fs');
var path = require('path');
var scriptName = require('../package.json').name;
var chai = require('chai');

chai.should();

describe('Integration test', function() {
  var room, logHelper, apiStubServer, config, apiServerDefaults,
      patchReactMethodOntoRoom, sendReaction, initLogMessages, wrapInfoMessages,
      matchingRule = 'Rule { reactionName: \'evergreen_tree\', ' +
        'githubRepository: \'handbook\' }';

  before(function(done) {
    apiStubServer = new ApiStubServer();
    process.env.HUBOT_SLACK_TOKEN = '<18F-github-token>';
    process.env.HUBOT_GITHUB_TOKEN = '<18F-github-token>';
    config = helpers.baseConfig();
    config.slackApiBaseUrl = apiStubServer.address() + '/slack/';
    config.githubApiBaseUrl = apiStubServer.address() + '/github/';

    temp.open(scriptName + '-integration-test-config-', function(err, info) {
      if (err) {
        return done(err);
      }
      fs.write(info.fd, JSON.stringify(config));
      fs.close(info.fd, function(err) {
        if (!err) {
          process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = info.path;
        }
        done(err);
      });
    });
  });

  after(function(done) {
    var configPath = process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;

    apiStubServer.close();
    delete process.env.HUBOT_SLACK_TOKEN;
    delete process.env.HUBOT_GITHUB_TOKEN;
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
    fs.unlink(configPath, done);
  });

  beforeEach(function() {
    logHelper = new LogHelper();
    logHelper.capture(function() {
      room = scriptHelper.createRoom({ httpd: false, name: 'handbook' });
    });
    patchReactMethodOntoRoom(room);
    room.robot.middleware.receive.stack[0].impl.slackClient.client = {
      getChannelByID: function() {
        return { name: 'handbook' };
      },
      team: { domain: '18f' }
    };
    apiStubServer.urlsToResponses = apiServerDefaults();
  });

  apiServerDefaults = function() {
    var metadata = helpers.metadata();

    return {
      '/slack/reactions.get': {
        expectedParams: {
          channel: helpers.CHANNEL_ID,
          timestamp: helpers.TIMESTAMP,
          token: process.env.HUBOT_SLACK_TOKEN
        },
        statusCode: 200,
        payload: helpers.messageWithReactions()
      },
      '/github/repos/18F/handbook/issues': {
        expectedParams: {
          title: metadata.title,
          body: metadata.url
        },
        statusCode: 200,
        payload: {
          'html_url': helpers.ISSUE_URL
        }
      },
      '/slack/reactions.add': {
        expectedParams: {
          channel: helpers.CHANNEL_ID,
          timestamp: helpers.TIMESTAMP,
          name: config.successReaction,
          token: process.env.HUBOT_SLACK_TOKEN
        },
        statusCode: 200,
        payload: { ok: true }
      }
    };
  };

  patchReactMethodOntoRoom = function(room) {
    room.user.react = function(userName, reaction) {
      return new Promise(function(resolve) {
        var reactionMessage = helpers.fullReactionAddedMessage();

        room.messages.push([userName, reaction]);
        reactionMessage.user.name = userName;
        reactionMessage.rawMessage.reaction = reaction;
        room.robot.receive(reactionMessage, resolve);
      });
    };
  };

  initLogMessages = function() {
    return [
      'INFO reading configuration from ' +
        process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH,
      'INFO registered receiveMiddleware'
    ];
  };

  wrapInfoMessages = function(messages) {
    return messages.map(function(message) {
      return 'INFO ' + helpers.MESSAGE_ID + ': ' + message;
    });
  };

  sendReaction = function(reactionName) {
    logHelper.beginCapture();
    return room.user.react('mbland', reactionName)
      .then(logHelper.endCaptureResolve(), logHelper.endCaptureReject());
  };

  it('should successfully load the application script', function() {
    logHelper.filteredMessages().should.eql(initLogMessages());
  });

  it('should not register if the config file is invalid', function() {
    var origPath = process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH,
        invalidConfigPath = path.join(
          __dirname, 'helpers', 'test-config-invalid.json');

    try {
      process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = invalidConfigPath;
      logHelper = new LogHelper();
      logHelper.capture(function() {
        room = scriptHelper.createRoom({ httpd: false, name: 'handbook' });
      });
      logHelper.filteredMessages().should.eql([
        'INFO reading configuration from ' + invalidConfigPath,
        'ERROR receiveMiddleware registration failed: Invalid configuration:'
      ]);
    } finally {
      process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = origPath;
    }
  });

  context('an evergreen_tree reaction to a message', function() {
    beforeEach(function() {
      return sendReaction(helpers.REACTION);
    });

    it('should create a GitHub issue', function() {
      room.messages.should.eql([
        ['mbland', 'evergreen_tree'],
        ['hubot', '@mbland created: ' + helpers.ISSUE_URL]
      ]);
      logHelper.filteredMessages().should.eql(
        initLogMessages().concat(wrapInfoMessages([
          'matches rule: ' + matchingRule,
          'getting reactions for ' + helpers.PERMALINK,
          'making GitHub request for ' + helpers.PERMALINK,
          'adding ' + config.successReaction,
          'created: ' + helpers.ISSUE_URL
        ]))
      );
    });
  });

  context('a evergreen_tree reaction to a message', function() {
    var payload = { message: 'test failure' };

    beforeEach(function() {
      var url = '/github/repos/18F/handbook/issues',
          response = apiStubServer.urlsToResponses[url];

      response.statusCode = 500;
      response.payload = payload;
      return sendReaction(helpers.REACTION);
    });

    it('should fail to create a GitHub issue', function() {
      var errorReply = 'failed to create a GitHub issue in ' +
            '18F/handbook: received 500 response from GitHub API: ' +
            JSON.stringify(payload),
          logMessages;

      room.messages.should.eql([
        ['mbland', 'evergreen_tree'],
        ['hubot', '@mbland Error: ' + errorReply]
      ]);

      logMessages = initLogMessages().concat(wrapInfoMessages([
        'matches rule: ' + matchingRule,
        'getting reactions for ' + helpers.PERMALINK,
        'making GitHub request for ' + helpers.PERMALINK
      ]));
      logMessages.push('ERROR ' + helpers.MESSAGE_ID + ': ' + errorReply);
      logHelper.filteredMessages().should.eql(logMessages);
    });
  });

  context('a message receiving an unknown reaction', function() {
    beforeEach(function() {
      Object.keys(apiStubServer.urlsToResponses).forEach(function(url) {
        var response = apiStubServer.urlsToResponses[url];

        response.statusCode = 500;
        response.payload = { message: 'should not happen' };
      });
      return sendReaction('sad-face');
    });

    it('should be ignored', function() {
      room.messages.should.eql([['mbland', 'sad-face']]);
      logHelper.filteredMessages().should.eql(initLogMessages());
    });
  });

  context('an unanticipated error from Middleware.expect', function() {
    beforeEach(function() {
      var impl = room.robot.middleware.receive.stack[0].impl;
      impl.slackClient.client.getChannelByID = function() {
        throw Error('forced error');
      };
      return sendReaction(helpers.REACTION);
    });

    it('should be caught and logged', function() {
      room.messages.should.eql([['mbland', helpers.REACTION]]);
      logHelper.filteredMessages().should.eql(
        initLogMessages().concat(['ERROR unhandled error: forced error '])
      );
      logHelper.messages[logHelper.messages.length - 1].should.have.string(
        '\nmessage: ' + JSON.stringify(
          helpers.reactionAddedMessage(), null, 2));
    });
  });
});
