/* jshint node: true */

'use strict';

module.exports = Config;

function Config(configuration) {
  var config = configuration || parseConfigFromEnvironmentVariablePath();

  for (var fieldName in config) {
    if (config.hasOwnProperty(fieldName)) {
      this[fieldName] = config[fieldName];
    }
  }
  this.validate();
}

var schema = {
  requiredTopLevelFields: {
    githubUser: 'GitHub username',
    githubTimeout: 'GitHub API timeout limit in milliseconds',
    slackTimeout: 'Slack API timeout limit in milliseconds',
    successReaction: 'emoji used to indicate an issue was successfully filed',
    rules: 'Slack-reaction-to-GitHub-issue rules'
  },
  requiredRulesFields: {
    reactionName: 'name of the reaction emoji triggering the rule',
    githubRepository: 'GitHub repository to which to post issues'
  },
  optionalRulesFields: {
    channelNames: 'names of the Slack channels triggering the rules; ' +
      'leave undefined to match messages in any Slack channel'
  }
};

Config.prototype.validate = function() {
  var errors = [],
      errMsg;

  this.checkRequiredTopLevelFields(errors);
  this.checkForUnknownFieldNames(errors);
  this.checkRequiredRulesFields(errors);
  this.checkForUnknownRuleFieldNames(errors);

  if (errors.length !== 0) {
    errMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');
    throw new Error(errMsg);
  }
};

function parseConfigFromEnvironmentVariablePath() {
}

Config.prototype.checkRequiredTopLevelFields = function(errors) {
  var fieldName;

  for (fieldName in schema.requiredTopLevelFields) {
    if (schema.requiredTopLevelFields.hasOwnProperty(fieldName) &&
        !this.hasOwnProperty(fieldName)) {
      errors.push('missing ' + fieldName);
    }
  }
};

Config.prototype.checkForUnknownFieldNames = function() {
};

Config.prototype.checkRequiredRulesFields = function() {
};

Config.prototype.checkForUnknownRuleFieldNames = function() {
};
