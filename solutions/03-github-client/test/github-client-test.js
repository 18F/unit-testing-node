/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var GitHubClient = require('../lib/github-client');
var ApiStubServer = require('./helpers/api-stub-server');
var helpers = require('./helpers');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

describe('GitHubClient', function() {
  var githubClient, githubApiServer, createServer;

  before(function() {
    githubClient = new GitHubClient(helpers.baseConfig());
    githubClient.protocol = 'http:';
    githubClient.host = 'localhost';
  });

  beforeEach(function() {
    githubApiServer = undefined;
  });

  afterEach(function() {
    if (githubApiServer) {
      githubApiServer.close();
    }
  });

  createServer = function(statusCode, payload) {
    var metadata = helpers.metadata();

    githubApiServer = new ApiStubServer();
    githubClient.port = githubApiServer.port();

    githubApiServer.urlsToResponses['/repos/18F/handbook/issues'] = {
      expectedParams: {
        title: metadata.title,
        body: metadata.url
      },
      statusCode: statusCode,
      payload: payload
    };
  };

  it('should successfully file an issue', function() {
    createServer(201, { 'html_url': helpers.ISSUE_URL });
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.eventually.equal(helpers.ISSUE_URL);
  });

  it('should fail to make a request if the server is down', function() {
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.be.rejectedWith('failed to make GitHub API request:');
  });

  it('should receive an error when filing an issue', function() {
    var payload = { message: 'test failure' };
    createServer(500, payload);
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.be.rejectedWith(Error, 'received 500 response from GitHub ' +
        'API: ' + JSON.stringify(payload));
  });
});
