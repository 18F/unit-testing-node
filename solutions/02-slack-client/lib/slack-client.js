/* jshint node: true */

'use strict';

var http = require('http');
var https = require('https');
var querystring = require('querystring');

module.exports = SlackClient;

function SlackClient(robotSlackClient, config) {
  this.client = robotSlackClient;
  this.timeout = config.slackTimeout;
  this.successReaction = config.successReaction;
  this.protocol = 'https:';
  this.host = 'slack.com';
}

SlackClient.prototype.getChannelName = function(channelId) {
  return this.client.getChannelByID(channelId).name;
};

SlackClient.prototype.getReactions = function(channel, timestamp) {
  return makeApiCall(this, 'reactions.get',
    { channel: channel, timestamp: timestamp });
};

SlackClient.prototype.addSuccessReaction = function(channel, timestamp) {
  return makeApiCall(this, 'reactions.add',
    { channel: channel, timestamp: timestamp, name: this.successReaction });
};

function getHttpOptions(that, method, queryParams) {
  return {
    protocol: that.protocol,
    host: that.host,
    port: that.port,
    path: '/api/' + method + '?' + querystring.stringify(queryParams),
    method: 'GET'
  };
}

function makeApiCall(that, method, params) {
  var requestFactory = (that.protocol === 'https:') ? https : http;

  return new Promise(function(resolve, reject) {
  });
}
