/* jshint node: true */

'use strict';

var testConfig = require('./test-config.json');

exports = module.exports = {
  CHANNEL_ID: 'C5150OU812',
  TIMESTAMP: '1360782804.083113',

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
  }
};
