/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var exec = require('child_process').exec;
var path = require('path');
var chai = require('chai');
var expect = chai.expect;

var rootDir = path.dirname(__dirname);
var scriptName = require(path.join(rootDir, 'package.json')).name;
var SUCCESS_MESSAGE = scriptName + ': registered receiveMiddleware';
var FAILURE_MESSAGE = scriptName + ': receiveMiddleware registration failed: ';

function checkHubot(done, expectedError) {
  exec('hubot -t', { cwd: rootDir }, function(error, stdout, stderr) {
    var lines = stdout.trim().split('\n');

    try {
      expect(error).to.be.null;
      stderr.should.eql('');

      if (expectedError) {
        lines.should.satisfy(hasFailureMessage(expectedError),
          'script didn\'t emit expected error: ' + expectedError);
      } else {
        lines.should.satisfy(hasSuccessMessage, 'script didn\'t register');
      }
      lines[lines.length - 1].should.eql('OK', '"OK" missing at end of output');
      done();

    } catch (err) {
      done(err + '\n' + lines.join('\n'));
    }
  });
}

function hasSuccessMessage(lines) {
  return lines.find(function(line) {
    return line.indexOf(SUCCESS_MESSAGE) !== -1;
  });
}

function hasFailureMessage(expectedError) {
  var failureMessage = FAILURE_MESSAGE + expectedError;

  return function(lines) {
    return lines.find(function(line) {
      return line.indexOf(failureMessage) !== -1;
    });
  };
}

describe('Smoke test', function() {
  beforeEach(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  after(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  it('should register successfully using the default config', function(done) {
    checkHubot(done);
  });

  it('should register successfully using the config from ' +
     'HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function(done) {
    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      __dirname, 'helpers', 'test-config.json');
    checkHubot(done);
  });

  it('should fail to register due to an invalid config', function(done) {
    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      __dirname, 'helpers', 'test-config-invalid.json');
    checkHubot(done, 'Invalid configuration:');
  });
});
