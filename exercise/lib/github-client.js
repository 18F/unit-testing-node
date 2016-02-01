'use strict';

module.exports = GitHubClient;

function GitHubClient(config) {
  this.user = config.githubUser;
  this.timeout = config.githubTimeout;
}

GitHubClient.prototype.fileNewIssue = function(/* metadata, repository */) {
};
