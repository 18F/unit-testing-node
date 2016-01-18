/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Middleware = require('../lib/middleware');
var Config = require('../lib/config');
var GitHubClient = require('../lib/github-client');
var SlackClient = require('../lib/slack-client');
var helpers = require('./helpers');
var sinon = require('sinon');
var chai = require('chai');

describe('Middleware', function() {
  var config, slackClient, githubClient, middleware;

  beforeEach(function() {
    config = new Config(helpers.baseConfig());
    middleware = new Middleware(config, slackClient, githubClient);
  });

  describe('findMatchingRule', function() {
    it('should find the rule matching the message', function() {
      var message = helpers.reactionAddedMessage(),
          expected = config.rules[config.rules.length - 1]
    });
  });

  describe('parseMetadata', function() {
    it('should parse GitHub request metadata from a message', function() {
    });
  });

  describe('execute', function() {
    it('should successfully parse a message and file an issue', function(done) {
      done();
    });
  });
});
