'use strict';

module.exports = Config;

function Config(configuration) {
  var config = configuration ||
        parseConfigFromEnvironmentVariablePathOrUseDefault();

  validate(config);

  for (var fieldName in config) {
    if (config.hasOwnProperty(fieldName)) {
      this[fieldName] = config[fieldName];
    }
  }
}

var schema = {
  requiredTopLevelFields: {
    githubUser: 'GitHub username',
    githubTimeout: 'GitHub API timeout limit in milliseconds',
    slackTimeout: 'Slack API timeout limit in milliseconds',
    successReaction: 'emoji used to indicate an issue was successfully filed',
    rules: 'Slack-reaction-to-GitHub-issue rules'
  },
  optionalTopLevelFields: {
    githubApiBaseUrl: 'Alternate base URL for GitHub API requests',
    slackApiBaseUrl: 'Alternate base URL for Slack API requests'
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

function validate(config) {
  var errors = [],
      errMsg;

  checkRequiredTopLevelFields(config, errors);
  checkForUnknownFieldNames(config, errors);
  checkRequiredRulesFields(config, errors);
  checkForUnknownRuleFieldNames(config, errors);

  if (errors.length !== 0) {
    errMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');
    throw new Error(errMsg);
  }
}

function parseConfigFromEnvironmentVariablePathOrUseDefault() {
}

function checkRequiredTopLevelFields(config, errors) {
  var fieldName;

  for (fieldName in schema.requiredTopLevelFields) {
    if (schema.requiredTopLevelFields.hasOwnProperty(fieldName) &&
        !config.hasOwnProperty(fieldName)) {
      errors.push('missing ' + fieldName);
    }
  }
}

function checkForUnknownFieldNames(/* config */) {
}

function checkRequiredRulesFields(/* config */) {
}

function checkForUnknownRuleFieldNames(/* config */) {
}
