'use strict';

var fs = require('fs');
var path = require('path');

module.exports = Config;

function Config(configuration, logger) {
  var config = configuration ||
        parseConfigFromEnvironmentVariablePathOrUseDefault(logger);

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

  if (config.rules) {
    checkRequiredRulesFields(config, errors);
    checkForUnknownRuleFieldNames(config, errors);
  }

  if (errors.length !== 0) {
    errMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');
    throw new Error(errMsg);
  }
}

function parseConfigFromEnvironmentVariablePathOrUseDefault(logger) {
  var configPath = (process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH ||
        path.join('config', 'slack-github-issues.json')),
      errorPrefix = 'failed to load configuration from ' + configPath + ': ';
  logger.info(null, 'reading configuration from', configPath);

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    if (err instanceof SyntaxError) {
      errorPrefix = errorPrefix + 'invalid JSON: ';
    }
    err.message = errorPrefix + err.message;
    throw err;
  }
}

function checkRequiredTopLevelFields(config, errors) {
  filterMissingFields(config, schema.requiredTopLevelFields)
    .forEach(function(fieldName) {
      errors.push('missing ' + fieldName);
    });
}

function filterMissingFields(object, requiredFields) {
  return Object.keys(requiredFields).filter(function(fieldName) {
    return !object.hasOwnProperty(fieldName);
  });
}

function checkForUnknownFieldNames(config, errors) {
  filterUnknownFields(config, schema.requiredTopLevelFields,
    schema.optionalTopLevelFields)
    .forEach(function(fieldName) {
      errors.push('unknown property ' + fieldName);
    });
}

function filterUnknownFields(object, requiredFields, optionalFields) {
  return Object.keys(object).filter(function(fieldName) {
    return !requiredFields.hasOwnProperty(fieldName) &&
      !optionalFields.hasOwnProperty(fieldName);
  });
}

function checkRequiredRulesFields(config, errors) {
  config.rules.forEach(function(rule, index) {
    filterMissingFields(rule, schema.requiredRulesFields)
      .forEach(function(fieldName) {
        errors.push('rule ' + index + ' missing ' + fieldName);
      });
  });
}

function checkForUnknownRuleFieldNames(config, errors) {
  config.rules.forEach(function(rule, index) {
    filterUnknownFields(rule, schema.requiredRulesFields,
      schema.optionalRulesFields)
      .forEach(function(fieldName) {
        errors.push('rule ' + index +
          ' contains unknown property ' + fieldName);
      });
  });
}
