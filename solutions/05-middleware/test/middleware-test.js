/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Middleware = require('../lib/middleware');
var Config = require('../lib/config');
var GitHubClient = require('../lib/github-client');
var SlackClient = require('../lib/slack-client');
var Logger = require('../lib/logger');
var helpers = require('./helpers');
var chai = require('chai');
var sinon = require('sinon');
var chaiAsPromised = require('chai-as-promised');

var expect = chai.expect;
chai.should();
chai.use(chaiAsPromised);

describe('Middleware', function() {
  var config, slackClient, githubClient, logger, middleware;

  beforeEach(function() {
    config = new Config(helpers.baseConfig());
    slackClient = new SlackClient(undefined, config);
    githubClient = new GitHubClient(config);
    logger = new Logger(console);
    middleware = new Middleware(config, slackClient, githubClient, logger);
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
    var getChannelName;

    beforeEach(function() {
      getChannelName = sinon.stub(slackClient, 'getChannelName');
      getChannelName.returns('handbook');
    });

    afterEach(function() {
      getChannelName.restore();
    });

    it('should parse GitHub request metadata from a message', function() {
      middleware.parseMetadata(helpers.messageWithReactions())
        .should.eql(helpers.metadata());
      getChannelName.calledOnce.should.be.true;
      getChannelName.args[0].should.eql([helpers.CHANNEL_ID]);
    });
  });

  describe('execute', function() {
    var context, next, hubotDone, message;

    beforeEach(function() {
      context = {
        response: {
          message: helpers.fullReactionAddedMessage(),
          reply: sinon.spy()
        }
      };
      next = sinon.spy();
      hubotDone = sinon.spy();
      message = helpers.fullReactionAddedMessage();

      slackClient = sinon.stub(slackClient);
      githubClient = sinon.stub(githubClient);
      logger = sinon.stub(logger);

      slackClient.getChannelName.returns('handbook');
      slackClient.getTeamDomain.returns('18f');
    });

    it('should successfully parse a message and file an issue', function(done) {
      slackClient.getReactions
        .returns(Promise.resolve(helpers.messageWithReactions()));
      githubClient.fileNewIssue.returns(Promise.resolve(helpers.ISSUE_URL));
      slackClient.addSuccessReaction
        .returns(Promise.resolve(helpers.ISSUE_URL));

      middleware.execute(context, next, hubotDone)
        .should.become(helpers.ISSUE_URL).then(function() {
        context.response.reply.args.should.eql([
          ['created: ' + helpers.ISSUE_URL]
        ]);
        next.calledWith(hubotDone).should.be.true;
        logger.info.args.should.eql([
          helpers.logArgs.matchingRule(),
          helpers.logArgs.getReactions(),
          helpers.logArgs.github(),
          helpers.logArgs.addSuccessReaction(),
          helpers.logArgs.success()
        ]);
      }).should.notify(done);
    });

    it('should ignore messages that do not match', function() {
      delete context.response.message.rawMessage;
      expect(middleware.execute(context, next, hubotDone)).to.be.undefined;
      next.calledWith(hubotDone).should.be.true;
    });
  });
});
