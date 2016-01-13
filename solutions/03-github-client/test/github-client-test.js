/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var GitHubClient = require('../lib/github-client');
var helpers = require('./helpers');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

describe('GitHubClient', function() {
  var githubClient;

  before(function() {
    githubClient = new GitHubClient(helpers.baseConfig());
    githubClient.protocol = 'http:';
    githubClient.host = 'localhost';
  });

  it('should successfully file an issue', function() {
    //return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
    //  .should.eventually.equal(helpers.ISSUE_URL);
  });

  it('should fail to make a request if the server is down', function() {
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.be.rejectedWith('failed to make GitHub API request:');
  });
});
