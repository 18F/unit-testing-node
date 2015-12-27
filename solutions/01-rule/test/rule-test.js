/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Rule = require('../lib/rule');
var chai = require('chai');
var expect = chai.expect;

describe('Rule', function() {
  it('should contain all the fields from the configuration', function() {
    var configRule = {
          reactionName: 'evergreen_tree',
          githubRepository: 'hub',
          channelNames: ['hub']
        },
        rule = new Rule(configRule);
    expect(JSON.stringify(rule)).to.eql(JSON.stringify(configRule));
  });
});
