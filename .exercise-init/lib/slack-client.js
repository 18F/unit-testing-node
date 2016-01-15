/* jshint node: true */

'use strict';

module.exports = SlackClient;

function SlackClient(robotSlackClient) {
  this.client = robotSlackClient;
}

SlackClient.prototype.getChannelName = function(channelId) {
  return this.client.getChannelByID(channelId).name;
};
