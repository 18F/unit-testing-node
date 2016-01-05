/* jshint node: true */

'use strict';

var http = require('http');
var https = require('https');
var packageInfo = require('../package.json');

module.exports = GitHubClient;

function GitHubClient(config) {
  this.user = config.githubUser;
  this.timeout = config.githubTimeout;
  this.protocol = 'https:';
  this.host = 'api.github.com';
}

GitHubClient.prototype.fileNewIssue = function(metadata, repository) {
  return makeApiCall(this, metadata, repository);
};

function getHttpOptions(client, repository, paramsStr) {
  return {
    protocol: client.protocol,
    host: client.host,
    port: client.port,
    path: '/repos/' + client.user + '/' + repository + '/issues',
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': 'token ' + process.env.HUBOT_GITHUB_TOKEN,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(paramsStr, 'utf8'),
      'User-Agent': packageInfo.name + '/' + packageInfo.version
    }
  };
}

function makeApiCall(client, metadata, repository) {
  var requestFactory = (client.protocol === 'https:') ? https : http,
      paramsStr = JSON.stringify({
        title: metadata.title,
        body: metadata.url
      });
}
