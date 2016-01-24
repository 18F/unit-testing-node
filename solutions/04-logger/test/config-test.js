/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Config = require('../lib/config');
var Logger = require('../lib/logger');
var helpers = require('./helpers');
var path = require('path');

var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

describe('Config', function() {
  before(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  afterEach(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  it('should validate a valid configuration', function() {
    var configData = helpers.baseConfig(),
        config = new Config(configData);

    expect(JSON.stringify(config)).to.equal(JSON.stringify(configData));
  });

  it('should raise errors for missing required fields', function() {
    var errors = [
          'missing githubUser',
          'missing githubTimeout',
          'missing slackTimeout',
          'missing successReaction',
          'missing rules'
        ],
        errorMessage = 'Invalid configuration:\n  ' + errors.join('\n  ');

    expect(function() { return new Config({}); }).to.throw(Error, errorMessage);
  });

  it('should validate optional config fields', function() {
    var configData = helpers.baseConfig(),
        config;
    configData.githubApiBaseUrl = 'http://localhost/github/';
    configData.slackApiBaseUrl = 'http://localhost/slack/';
    configData.rules[0].channelNames = ['hub'];

    config = new Config(configData);
    expect(JSON.stringify(config)).to.equal(JSON.stringify(configData));
  });

  it('should raise errors for unknown top-level properties', function() {
    var configData = helpers.baseConfig(),
        errors = [
          'unknown property foo',
          'unknown property baz',
          'rule 0 contains unknown property xyzzy'
        ],
        errorMessage = 'Invalid configuration:\n  ' + errors.join('\n  ');

    configData.foo = 'bar';
    configData.baz = ['quux'];
    configData.rules[0].xyzzy = 'plugh';

    expect(function() { return new Config(configData); })
      .to.throw(Error, errorMessage);
  });

  it('should raise errors for missing required rules fields', function() {
    var configData = helpers.baseConfig(),
        errors = [
          'rule 0 missing reactionName',
          'rule 2 missing githubRepository'
        ],
        errorMessage = 'Invalid configuration:\n  ' + errors.join('\n  ');

    delete configData.rules[0].reactionName;
    delete configData.rules[2].githubRepository;

    expect(function() { return new Config(configData); })
      .to.throw(Error, errorMessage);
  });

  it('should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function() {
    var testConfig = require('./helpers/test-config.json'),
        logger = new Logger(console),
        configPath = path.join(__dirname, 'helpers', 'test-config.json'),
        config;

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = configPath;
    sinon.stub(logger, 'info');
    config = new Config(null, logger);
    expect(JSON.stringify(config)).to.eql(JSON.stringify(testConfig));
    expect(logger.info.args).to.eql([
      [null, 'reading configuration from', configPath]
    ]);
  });

  it('should load from config/slack-github-issues.json by default', function() {
    var testConfig = require('../config/slack-github-issues.json'),
        logger = new Logger(console),
        configPath = path.join('config', 'slack-github-issues.json'),
        config;

    sinon.stub(logger, 'info');
    config = new Config(null, logger);
    expect(JSON.stringify(config)).to.eql(JSON.stringify(testConfig));
    expect(logger.info.args).to.eql([
      [null, 'reading configuration from', configPath]
    ]);
  });

  it('should raise an error if the config file does not exist', function() {
    var logger = new Logger(console),
        configPath = path.join(__dirname, 'nonexistent-config-file'),
        errorMessage = 'failed to load configuration from ' + configPath +
          ': ENOENT: no such file or directory';

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = configPath;
    sinon.stub(logger, 'info');
    expect(function() { return new Config(null, logger); })
      .to.throw(Error, errorMessage);
    expect(logger.info.args).to.eql([
      [null, 'reading configuration from', configPath]
    ]);
  });

  it('should raise an error if the config file isn\'t valid JSON', function() {
    var logger = new Logger(console),
        errorMessage = 'failed to load configuration from ' + __filename +
          ': invalid JSON: Unexpected token /';

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = __filename;
    sinon.stub(logger, 'info');
    expect(function() { return new Config(null, logger); })
      .to.throw(Error, errorMessage);
    expect(logger.info.args).to.eql([
      [null, 'reading configuration from', __filename]
    ]);
  });
});
