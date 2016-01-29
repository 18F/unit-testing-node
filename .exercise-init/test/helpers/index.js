'use strict';

var testConfig = require('./test-config.json');

exports = module.exports = {
  baseConfig: function() {
    return JSON.parse(JSON.stringify(testConfig));
  }
};
