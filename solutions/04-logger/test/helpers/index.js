'use strict';

var testConfig = require('./test-config.json');

exports = module.exports = {
  CHANNEL_ID: 'C5150OU812',
  TIMESTAMP: '1360782804.083113',
  PERMALINK: 'https://18f.slack.com/archives/handbook/p1360782804083113',
  ISSUE_URL: 'https://github.com/18F/handbook/issues/1',

  baseConfig: function() {
    return JSON.parse(JSON.stringify(testConfig));
  },

  messageWithReactions: function() {
    return {
      ok: true,
      type: 'message',
      channel: exports.CHANNEL_ID,
      message: {
        type: 'message',
        ts: exports.TIMESTAMP,
        reactions: [
        ]
      }
    };
  },

  metadata: function() {
    return {
      channel: 'handbook',
      timestamp: exports.TIMESTAMP,
      url: exports.PERMALINK,
      date: new Date(1360782804.083113 * 1000),
      title: 'Update from #handbook at Wed, 13 Feb 2013 19:13:24 GMT'
    };
  }
};
