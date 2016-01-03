/* jshint node: true */

'use strict';

var http = require('http');
var querystring = require('querystring');
var url = require('url');

module.exports = SlackApiStubServer;

function SlackApiStubServer() {
  var that = this;

  this.urlsToResponses = {};

  this.server = new http.Server(function(req, res) {
    var baseUrl = url.parse(req.url),
        responseData = that.urlsToResponses[baseUrl.pathname],
        payload,
        expectedParams,
        actualParams;

    if (!responseData) {
      res.statusCode = 500;
      res.end('unexpected URL: ' + req.url);
      return;
    }

    res.statusCode = responseData.statusCode;
    payload = responseData.payload;
    expectedParams = JSON.stringify(responseData.expectedParams);
    actualParams = JSON.stringify(querystring.parse(baseUrl.query));

    if (actualParams !== expectedParams) {
      res.statusCode = 500;
      payload = 'expected params ' + expectedParams +
        ', actual params ' + actualParams;
    }
    res.end(JSON.stringify(payload));
  });
  this.server.listen(0);
}

SlackApiStubServer.prototype.port = function() {
  return this.server.address().port;
};

SlackApiStubServer.prototype.close = function() {
  this.server.close();
};
