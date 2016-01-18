/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Middleware = require('../lib/middleware');
var Config = require('../lib/config');
var GitHubClient = require('../lib/github-client');
var SlackClient = require('../lib/slack-client');
var helpers = require('./helpers');
var chai = require('chai');
var sinon = require('sinon');

var expect = chai.expect;
chai.should();

describe('Middleware', function() {
  var config, slackClient, githubClient, middleware;

  beforeEach(function() {
    config = new Config(helpers.baseConfig());
    slackClient = new SlackClient(undefined, config);
    githubClient = new GitHubClient(config);
    middleware = new Middleware(config, slackClient, githubClient);
  });

  describe('findMatchingRule', function() {
    var getChannelName, message;

    beforeEach(function() {
      getChannelName = sinon.stub(slackClient, 'getChannelName');
      getChannelName.returns('not-any-channel-from-any-config-rule');
      message = helpers.reactionAddedMessage();
    });

    afterEach(function() {
      getChannelName.restore();
    });

    it('should find the rule matching the message', function() {
      var expected = config.rules[config.rules.length - 1],
          result = middleware.findMatchingRule(message);

      result.reactionName.should.equal(expected.reactionName);
      result.githubRepository.should.equal(expected.githubRepository);
      result.should.not.have.property('channelName');
    });

    it('should ignore a message if it is undefined', function() {
      // When execute() tries to pass context.response.message.rawMessage from
      // a message that doesn't have one, the argument to findMatchingRule()
      // will be undefined.
      expect(middleware.findMatchingRule(undefined)).to.be.undefined;
    });

    it('should ignore a message if its type does not match', function() {
      message.type = 'hello';
      expect(middleware.findMatchingRule(message)).to.be.undefined;
    });

    it('should ignore a message if its item type does not match', function() {
      message.item.type = 'file';
      expect(middleware.findMatchingRule(message)).to.be.undefined;
    });

    it('should ignore messages that do not match any rule', function() {
      message.reaction = 'sad-face';
      expect(middleware.findMatchingRule(message)).to.be.undefined;
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
