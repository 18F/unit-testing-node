/* jshint node: true */

'use strict';

var http = require('http');
var querystring = require('querystring');
var url = require('url');

module.exports = ApiStubServer;

function ApiStubServer() {
  var stubServer = this;

  this.urlsToResponses = {};

  this.server = new http.Server(function(req, res) {
    var baseUrl = url.parse(req.url),
        responseData = stubServer.urlsToResponses[baseUrl.pathname];

    if (!responseData) {
      res.statusCode = 500;
      res.end('unexpected URL: ' + req.url);
      return;
    }
    compareParamsAndRespond(res, responseData,
      querystring.parse(baseUrl.query));
  });
  this.server.listen(0);
}

function compareParamsAndRespond(res, responseData, actualParams) {
  var payload = responseData.payload,
      expectedParams = JSON.stringify(responseData.expectedParams);

  res.statusCode = responseData.statusCode;
  actualParams = JSON.stringify(actualParams);

  if (actualParams !== expectedParams) {
    res.statusCode = 500;
    payload = 'expected params ' + expectedParams +
      ', actual params ' + actualParams;
  }
  res.end(JSON.stringify(payload));
}

ApiStubServer.prototype.port = function() {
  return this.server.address().port;
};

ApiStubServer.prototype.close = function() {
  this.server.close();
};
