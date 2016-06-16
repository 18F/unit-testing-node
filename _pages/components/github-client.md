---
title: GitHubClient class
---
The `GitHubClient` class encapsulates the application's dependency on the
[GitHub API](https://api.slack.com/). You can find it in the
[`exercise/lib/github-client.js`]({{ site.baseurl }}/exercise/lib/github-client.js)
file.

If you don't have experience writing HTTP calls and launching test servers,
testing the `GitHubClient` class is a great way to get acquainted. You should
be familiar with the [HTTP `POST`
method](http://www.w3schools.com/tags/ref_httpmethods.asp) and the concept of
[Web Application Programming Interfaces
(APIs)](http://readwrite.com/2013/09/19/api-defined/). If you're looking for
more of a challenge, then move on to the next chapter. And if you've skipped
ahead to this chapter, you can establish the starting state of the `exercise/`
files for this chapter by running:

```sh
$ ./go set-github-client
```

## What to expect

After receiving a `reaction_added` event and fetching all the message
reactions via `SlackClient.getReactions`, you'll use the [GitHub API to
create a new issue](https://developer.github.com/v3/issues/#create-an-issue).
Like `SlackClient`, this class is a [facade
class](https://sourcemaking.com/design_patterns/facade) that limits the
exposure of the GitHub API to your application's code.

Facades offer several advantages:

- The methods comprising the facade interface document all uses of the external
  dependency.
- When the upstream interface changes, only this class should require any
  changes, minimizing the cost and risk of upgrades.
- By using [dependency
  injection]({{ site.baseurl }}/concepts/dependency-injection/) to construct
  objects using the facade, a test double implementing the same interface can
  model the external behavior. When used well, this technique reduces direct
  dependencies on the external code, and makes tests faster, more reliable,
  and more thorough.

GitHub API wrapper packages exist, but since this is the only API call your
application will make, you'll write your own code to [minimize
dependencies](/concepts/minimizing-dependencies/). Because the code required is
relatively small and straightforward, it also provides a good example of _how_
to write and test web API wrappers.

This class is actually a little smaller than `SlackClient`. However, whereas
`SlackClient` makes a GET request with all its information encoded in the
URL, `GitHubClient` makes a POST request that requires specific HTTP headers.

You will learn:

- To manage HTTP bookkeeping
- The basics of using a
  [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
  to encapsulate an asynchronous operation
- How to test HTTP requests by launching a local HTTP test server
- How to use `Promises` with mocha and chai

## Starting to build `GitHubClient`

The beginning of the `github-client.js` file, where the `GitHubClient`
constructor is defined, looks like this:

```js
'use strict';

module.exports = GitHubClient;

function GitHubClient(config) {
  this.user = config.githubUser;
  this.timeout = config.githubTimeout;
}

GitHubClient.prototype.fileNewIssue = function(/* metadata, repository */) {
};
```

You can see that the constructor pulls the GitHub-related parameters from a
`Config` object. The first thing you need to do is set a `baseurl` property
such that the `GitHubClient` will make calls to `https://api.github.com` by
default. Your tests, however, will override this property via
`Config.githubApiBaseUrl` so that requests go to `http://localhost` instead.

Start by encoding the production default as a module constant:

```js
GitHubClient.API_BASE_URL = 'https://api.github.com/';
```

Then, add a require statement for the [standard `url`
package](https://nodejs.org/api/url.html):

```js
var url = require('url');
```

Now, add the following to your constructor:

```
  this.baseurl = url.parse(config.githubApiBaseUrl ||
    GitHubClient.API_BASE_URL);
```

## Writing the request function

Much like you did with `SlackClient`, make `fileNewIssue` a thin wrapper
around a `makeApiCall` function.  (The parameters `metadata` and `repository`
are commented out to avoid unused argument errors from `npm run lint`. Go
ahead and uncomment them now.)

```js
GitHubClient.prototype.fileNewIssue = function(metadata, repository) {
  return makeApiCall(this, metadata, repository);
};

function makeApiCall(client, metadata, repository) {
}
```

Note that `makeApiCall` is *not* a member of `GitHubClient`, and that its
first parameter, `client`, is actually the `this` reference from the
`GitHubClient` method. `makeApiCall` is going to define a [nested
function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#Nested_functions_and_closures)
to launch an asynchronous HTTP request. Were `makeApiCall` a member of
`GitHubClient`, [`this` would not refer to the `GitHubClient` object inside
the nested
handler](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#Lexical_this).
This can prove very confusing, especially to people with experience in
object-oriented languages. Translating `this` to `client` in this way
sidesteps the problem, and having `makeApiCall` private to the module keeps
the `GitHubClient` interface narrow.

## Selecting HTTP vs. HTTPS

Import the [`http`](https://nodejs.org/api/http.html) and
[`https`](https://nodejs.org/api/https.html) modules from the Node.js standard
library:

```js
var http = require('http');
var https = require('https');
```

Both have a `request` function that accepts the same set of HTTP options that
you will build using a helper function. Add the following to the
`GitHubClient` constructor to select the correct library depending on whether
the code is running under test or in production:

```js
function GitHubClient(config) {
  // ...
  this.requestFactory = (this.baseurl.protocol === 'https:') ? https : http;
};
```

## Building the API method parameters

The `metadata` argument to `makeApiCall` will contain information from the
message that received the reaction from which to build the GitHub issue. It
will contain two properties: `title:` (constructed by the `Middleware` class)
and `url:` (which will be the permalink for the message).

The `repository` argument is name of the repository to which to post the
issue. This should be just the last component of the repository's GitHub URL
after the user or organization name specified by `Config.githubUser`. For
example, for `{{ site.repos[0].url }}`, this would be `{{ site.repos[0].url |
split:"/" | last }}`.

You'll use the `metadata` object to create the [issue creation API method
parameters](https://developer.github.com/v3/issues/#create-an-issue) as a JSON
object, encoded as a string in the request body:

```js
  var paramsStr = JSON.stringify({
        title: metadata.title,
        body: metadata.url
      });
```

## Building the HTTP options

The HTTP request is straightforward to build, if a little cumbersome, since it
contains so many parameters. To make the process less cumbersome, introduce a
helper function:

```js
function getHttpOptions(client, repository, paramsStr) {
  var baseurl = client.baseurl;
  return {
    protocol: baseurl.protocol,
    host: baseurl.hostname,
    port: baseurl.port,
    path: baseurl.pathname + 'repos/' + client.user + '/' + repository +
      '/issues',
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
```

A few things to note here:

- You should assign `port: baseurl.port`. When `port:` is undefined, the
  request uses the default port for HTTP (80) or HTTPS(443). In the tests, you
  will launch a local HTTP server with a dynamically assigned port. You'll
  assign this
  server's URL, including its port value, to the `githubApiBaseUrl` property
  of the `Config` object used to create the `GitHubClient` instance under
  test. In `getHttpOptions`, that dynamic port value will then propagate to
  this options object.
- You [specify the GitHub API version in the `Accept`
  header](https://developer.github.com/v3/#current-version).
- Unlike with the Slack API, you [pass the GitHub API token in the
  `Authorization` header](https://developer.github.com/v3/#authentication).
  This token comes from the `HUBOT_GITHUB_TOKEN` environment variable,
  accessible via
  [`process.env`](https://nodejs.org/api/process.html#process_process_env).
- Unlike with the Slack API, you must assign the `Content-Type` and
  `Content-Length` because the parameters (encoded as `paramsStr`) will appear
  in the request body as JSON.
- You calculate `Content-Length` using
  [`Buffer.byteLength`](https://nodejs.org/api/buffer.html#buffer_class_method_buffer_bytelength_string_encoding)
  rather than relying on `paramsStr.length`, which may be smaller than the
  actual byte length due to multibyte characters.
- [GitHub requires the `User-Agent` header](https://developer.github.com/v3/#user-agent-required),
  which you've set to [the name and version of the
  program](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.43).

To import the `packageInfo` properties used in the `User-Agent` definition,
add the following `require` statement to the top of the file:

```js
var packageInfo = require('../package.json');
```

Normally, this directive will refer to the `package.json` file in the root
directory of your project. In your working copy, however, it will refer to
`exercise/package.json`, which should contain just the information needed by
the example code:

```json
{
  "name": "18f-unit-testing-node",
  "version": "0.0.0"
}
```

## Making the HTTP request using `Promise`

[`Promises`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
represent asynchronous operations that will either _resolve_ to a value or be
_rejected_ with an error. This abstraction works especially well for HTTP
requests, which are common asynchronous operations. For background, please see
the [`SlackClient` section on
`Promises`]({{ site.baseurl }}/components/slack-client/#promises),
as well as
[Promise gotcha #0]({{ site.baseurl }}/components/slack-client/#promises-gotcha-0)
and
[Promise gotcha #1]({{ site.baseurl }}/components/slack-client/#promises-gotcha-1).

Start fleshing out `makeApiCall` by defining a `Promise`:

```js
function makeApiCall(client, metadata, repository) {
  var paramsStr = JSON.stringify({
        title: metadata.title,
        body: metadata.url
      });

  return new Promise(function(resolve, reject) {
    // We'll fill in the implementation here shortly.
  });
}
```

To recap from the `SlackClient` chapter, `resolve` and `reject` are callback
functions that the `Promise` should call when the operation succeeds or fails.
You can pass the result of a successful operation to `resolve`, and an
[`Error`](https://nodejs.org/api/errors.html) or similar object to `reject`.
Now, make your request:

```js
  return new Promise(function(resolve, reject) {
    var httpOptions = getHttpOptions(client, repository, paramsStr),
        req = client.requestFactory.request(httpOptions, function(res) {
          handleResponse(res, resolve, reject);
        });

    req.setTimeout(client.timeout);
    req.on('error', function(err) {
      reject(new Error('failed to make GitHub API request: ' + err.message));
    });
    req.end(paramsStr);
  });
```

This brings the `httpOptions` and `requestFactory` pieces together to make the
actual HTTP request, delegating `resolve` and `reject` to `handleResponse`
(which you'll fill in next). Also note that:

- `req` is a
  [http.ClientRequest](https://nodejs.org/api/http.html#http_class_http_clientrequest),
  which implements the
  [`WritableStream` interface](https://nodejs.org/api/stream.html#stream_class_stream_writable),
  itself derived from
  [`EventEmitter`](https://nodejs.org/api/events.html#events_class_events_eventemitter).
- You've set a timeout, passed from `Config.githubTimeout`, to limit how long
  to wait before canceling the request.
- You've also set an error handler in case the program fails to send the
  request, and pass an `Error` to `reject` to complete the operation.
- You'll finally send the request with `req.end`, passing `paramsStr` as the
  body of the request.

Please take this opportunity to review [Promise gotcha #0: not calling
`resolve` or `reject`]({{ site.baseurl
}}/components/slack-client/#promises-gotcha-0) from the `SlackClient` chapter
before moving on to the next section.

## Delegating to `handleResponse`

All that's left now is to implement the `handleResponse` delegate. Start by
adding this to your module:

```js
function handleResponse(res, resolve, reject) {
  var result = '';

  res.setEncoding('utf8');
  res.on('data', function(chunk) {
    result = result + chunk;
  });
  res.on('end', function() {
    // We'll fill this in shortly.
  });
}
```

The `res` parameter is an instance of
[http.ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse), also a `WritableStream`.
The
[`setEncoding` method](https://nodejs.org/api/stream.html#stream_readable_setencoding_encoding)
comes from `WritableStream` and ensures that each chunk of the JSON payload is
passed as a UTF-8 string to the [`'data'`
event](https://nodejs.org/api/stream.html#stream_event_data). The `'data'`
event handler builds up the `result` string one piece at a time.

## Handling the completed HTTP response

The `'end'` event happens once you've finished receiving the entire server
response. This is the last piece you need to finish the `GitHubClient`:

```js
  res.on('end', function() {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        resolve(JSON.parse(result).html_url);
      } catch (err) {
        reject(new Error('could not parse JSON response from GitHub API: ' +
          result));
      }
    } else {
      reject(new Error('received ' + res.statusCode +
        ' response from GitHub API: ' + result));
    }
  });
```
A few things to notice about this handler:

- It _only_ accepts [200 class HTTP status
  codes](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2).
- If the status code isn't in the 200 class, you'll call `reject` with an
  `Error` that contains the unparsed body of the request.
- You have to call
  [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
  on the body. If successful, the `Promise` for the HTTP request will resolve
  to the `html_url` value from the response.
- If the status code was not in the 200 class, or if the response failed to
  parse, you reject the `Promise` with an error containing the body of the
  request.

## Preparing to test the API interaction

And now for the moment of truth! First, add the following to the top of the
`exercise/test/github-client-test.js` file:

```js
var GitHubClient = require('../lib/github-client');
```

Run `npm test` to ensure all the tests still pass. (`npm run lint` would be a
good idea, too.) Now run just the `GitHubClient` tests:

```sh
$ npm test -- --grep '^GitHubClient '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^GitHubClient "

[14:18:29] Using gulpfile .../unit-testing-node/gulpfile.js
[14:18:29] Starting 'test'...


  GitHubClient
    ✓ should successfully file an issue


  1 passing (5ms)

[14:18:29] Finished 'test' after 95 ms
```

Before getting into the details of the setup, fill in the `should successfully
file an issue` test with the following assertion:

```js
  it('should successfully file an issue', function() {
    // We'll add the setup here shortly.
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.eventually.equal(helpers.ISSUE_URL);
  });
```

Let's examine what's going on here. The `fileNewIssue` call takes `metadata`
and `repository` as arguments, and resolves to `ISSUE_URL`. Because it's
likely you'll want to use the same sample data through the test suite, add the
following constants and the `metadata` factory function to
`exercise/test/helpers/index.js`:

```js
exports = module.exports = {
  // ...existing constants...
  PERMALINK: 'https://18f.slack.com/archives/handbook/p1360782804083113',
  ISSUE_URL: 'https://github.com/18F/handbook/issues/1',

  // ...existing implementation...
  // Don't forget to add a comma after the previous item in the object!

  metadata: function() {
    return {
      channel: 'handbook',
      timestamp: exports.TIMESTAMP,
      url: exports.PERMALINK,
      date: new Date(1360782804.083113 * 1000),
      title: 'Update from #handbook at Wed, 13 Feb 2013 19:13:24 GMT',
    };
  }
};
```

Remember that `metadata` is returning a fresh copy of the data for each test
so that any changes made by one test do not accidentally influence any other
tests.

Using the `helpers` module implies that you need to add the following to the
top of the test file:

```js
var helpers = require('./helpers');
```

## `Promise`-based assertions

Also notice that the test assertion starts with `return` and ends with
`.should.become(helpers.ISSUE_URL)`. This assertion is _returning a
`Promise`_ and is a combination of two features:

- The Mocha framework's [ability to detect returned Promises and wait for them
  to become resolved or rejected](https://mochajs.org/#working-with-promises).
- The ability of the Chai-as-Promised extension (of the Chai assertion
  library) to provide [expect/should-style
  assertions](https://www.npmjs.com/package/chai-as-promised#should-expect-interface).

To enable these features, add the following lines to the top of the test file:

```js
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);
```

# Defining `githubClient`

You should now be able to instantiate a `GitHubClient` instance:

```js
describe('GitHubClient', function() {
  var githubClient;

  before(function() {
    var config = helpers.baseConfig();
    config.githubApiBaseUrl = 'http://localhost';
    githubClient = new GitHubClient(config);
  });

  it('should successfully file an issue', function() {
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.eventually.equal(helpers.ISSUE_URL);
  });
});
```

A few things are happening here:

- As mentioned earlier, you've defined `config.githubApiBaseUrl` so the
  `GitHubClient` will send requests to `http://localhost/repos/`, *not*
  `https://api.github.com/repos/`.
- The `GitHubClient` state affecting its behavior (`config.githubApiBaseUrl`)
  is constant across every test. Consequently, you only create one instance in
  the `before` block, rather than one per test in `beforeEach`.

At this point, run your test:

```sh
$ npm test -- --grep '^GitHubClient '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^GitHubClient "

[14:40:31] Using gulpfile .../unit-testing-node/gulpfile.js
[14:40:31] Starting 'test'...


  GitHubClient
    1) should successfully file an issue


  0 passing (20ms)
  1 failing

  1) GitHubClient should successfully file an issue:
     Error: GitHub API call failed: connect ECONNREFUSED 127.0.0.1:80
    at ClientRequest.<anonymous> (exercise/lib/github-client.js:54:14)
    at Socket.socketErrorListener (_http_client.js:265:9)
    at emitErrorNT (net.js:1256:8)




[14:40:31] 'test' errored after 121 ms
[14:40:31] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

This is what you _want_ to see at this point because you haven't launched a
`localhost` HTTP server yet.

## Broken `Promises`

Before moving on to the next section, remove the `return` keyword from the
test assertion and run the test to see what happens:

```sh
$ npm test -- --grep '^GitHubClient '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^GitHubClient "

[14:45:58] Using gulpfile .../unit-testing-node/gulpfile.js
[14:45:58] Starting 'test'...


  GitHubClient
    ✓ should successfully file an issue


  1 passing (18ms)

[14:45:58] Finished 'test' after 106 ms
```

In this case, what happened is that you **forgot** to `return` the new
`Promise`. Please review [Promise gotcha #1: not returning the `Promise`]({{
site.baseurl }}/components/slack-client/#promises-gotcha-1) from the
`SlackClient` chapter for more background. Restore the missing `return`
statement and run the test again to ensure that it fails before moving on.

## Testing the error case

Before you fix the test, copy it and make a new test out of it:

```js
  it('should fail to make a request if the server is down', function() {
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.be.rejectedWith('failed to make GitHub API request:');
  });
```

Run the tests to make sure this one passes. If it does, you can remain
confident that, if the real GitHub API server is down, your `GitHubClient`
will report the error instead of silently failing.

## Updating the `ApiStubServer` to handle POST requests and check HTTP headers

Now for the fun part: updating [the `ApiStubServer` that you implemented in
the `SlackClient`
chapter]({{ site.baseurl }}/components/slack-client/#api-stub-server)! Please
review that section for background on the features and implementation details.

At the moment, that server does most of what you need it to, but it only
handles HTTP GET requests and doesn't check HTTP headers.

The first thing you will do is refactor the checks into a new function
`compareParamsAndRespond`. The server implementation should now look like
this:

```js
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
```

Run `npm test` (_not_ `npm test -- --grep '^GitHubClient '`) to make sure all
the tests still pass. You haven't changed the behavior of the `ApiStubServer`.
However, with `compareParamsAndRespond` extracted, you can better share that
code between the `GET` case needed by `SlackClient` and the `POST` case needed
by `GitHubClient`. Put this new structure in place within the `http.Server`
callback within the `ApiStubServer` constructor:

```js
  this.server = new http.Server(function(req, res) {
    var baseUrl = url.parse(req.url),
        responseData = stubServer.urlsToResponses[baseUrl.pathname];

    if (!responseData) {
      res.statusCode = 500;
      res.end('unexpected URL: ' + req.url);

    } else if (req.method === 'GET') {
      compareParamsAndRespond(req, res, responseData,
        querystring.parse(baseUrl.query));

    } else if (req.method === 'POST') {
      comparePostParamsAndRespond(res, responseData);

    } else {
      res.statusCode = 500;
      res.end('unexpected HTTP method "' + req.method +
        '" for URL: ' + req.url);
    }
  });
```

`comparePostParamsAndRespond`, defined below, needs to get the request
parameters from the JSON object encoded in the body. Since `req` implements
the [`WritableStream`
interface](https://nodejs.org/api/stream.html#stream_class_stream_writable),
unlike the `GET` example, you'll have to piece together the body before
parsing the JSON object and calling `compareParamsAndRespond`.

```js
function comparePostParamsAndRespond(req, res, responseData) {
  var data = '';

  req.setEncoding('utf8');
  req.on('data', function(chunk) {
    data = data + chunk;
  });
  req.on('end', function() {
    try {
      compareParamsAndRespond(res, responseData, JSON.parse(data));

    } catch (err) {
      res.statusCode = 500;
      res.end('could not parse JSON request for ' + req.url +
        ': ' + err + ': ' + data);
    }
  });
}
```

Run `npm test` again to make sure everything passes.

## Testing the helper?

While this test "helper" is getting complex enough to warrant its own tests,
you're testing it using the actual application. If you were to reuse this in
other applications, you'd want to make a well-tested npm out of it.
Alternatively, you could use an existing library like
[`nock`](https://www.npmjs.com/package/nock).

The reason this tutorial rolls its own is to provide a bit of insight into how
to write basic HTTP testing servers using the Node.js standard library.
However, retrofitting another package into the existing tests would be an
excellent exercise.

## Launching the `ApiStubServer`

To make use of your newly updated `ApiStubServer`, first `require` its module:

```js
var ApiStubServer = require('./helpers/api-stub-server');
```

Add variables to the fixture referencing the server and the helper function
that will configure it:

```js
describe('GitHubClient', function() {
  var githubClient, githubApiServer, setResponse;
```

Start a new instance for the test fixture, close it after all tests have
finished running, and clear its state after every test case:

```js
  before(function() {
    var config = helpers.baseConfig();
    githubApiServer = new ApiStubServer();
    config.githubApiBaseUrl = githubApiServer.address();
    githubClient = new GitHubClient(config);
  });

  after(function() {
    githubApiServer.close();
  });

  afterEach(function() {
    githubApiServer.urlsToResponses = {};
  });
```

Because the interaction with the GitHub API is limited, you can write a
`setResponse` function that is more focused than that appearing in the
`SlackClient` test.

```js
  setResponse = function(statusCode, payload) {
    var metadata = helpers.metadata();

    githubApiServer.urlsToResponses['/repos/18F/handbook/issues'] = {
      expectedParams: {
        title: metadata.title,
        body: metadata.url
      },
      statusCode: statusCode,
      payload: payload
    };
  };
```

Add the following line at the beginning of the `should successfully file an
issue` test:

```js
    setResponse(201, { 'html_url': helpers.ISSUE_URL });
```

Now run `npm test -- --grep '^GitHubClient '` to verify that the request
succeeds:

```sh
$ npm test -- --grep '^GitHubClient'

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^GitHubClient"

[12:08:36] Using gulpfile .../unit-testing-node/gulpfile.js
[12:08:36] Starting 'test'...


  GitHubClient
    ✓ should successfully file an issue
    1) should fail to make a request if the server is down


  1 passing (49ms)
  1 failing

  1) GitHubClient should fail to make a request if the server is down:
     AssertionError: expected promise to be rejected with an error including
     'failed to make GitHub API request:' but got 'Error: received 500
     response from GitHub API: unexpected URL: /repos/18F/handbook/issues'





[12:08:36] 'test' errored after
[12:08:36] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

Whoops! Now that you've launched a working server, the test for the error case
fails. To rectify this, create `Config` and `GitHubClient` instances local to
this one test to simulate an unreachable server:

```js
  it('should fail to make a request if the server is down', function() {
    var config = helpers.baseConfig(),
        githubClient;
    config.githubApiBaseUrl = 'http://localhost';
    githubClient = new GitHubClient(config);

  return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.be.rejectedWith('failed to make GitHub API request:');
  });
```

Confirm that both tests pass:

```sh
$ npm test -- --grep '^GitHubClient '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^GitHubClient "

[10:05:16] Using gulpfile .../unit-testing-node/gulpfile.js
[10:05:16] Starting 'test'...


  GitHubClient
    ✓ should successfully file an issue
    ✓ should fail to make a request if the server is down


  2 passing (39ms)

[10:05:16] Finished 'test' after 133 ms
```

## Testing an error response from the server

For your next test, simulate an error from the GitHub server:

```js
  it('should receive an error when filing an issue', function() {
    var payload = { message: 'test failure' };
    setResponse(500, payload);
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.be.rejectedWith(Error, 'received 500 response from GitHub ' +
        'API: ' + JSON.stringify(payload));
  });
```

Once again, you're checking the result using `rejectedWith`, but the error
comes from the server's [500 class
response](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5).
The error message contains the full payload returned from the server.

## Sanity testing the selection of the base API URL

In all the excitement, you've forgotten to test one small (yet critical) piece
of behavior: parsing `GitHubClient.API_BASE_URL` when
`Config.githubApiBaseUrl` is undefined. It's trivial, but it's also easy to
test, and the application won't work at all if anyone happens to break this
behavior.

To start, add the following to the `require` statements at the top:

```js
var url = require('url');
```

Now add two test cases near the top of the fixture (before the `it should
successfully file an issue` test case):

```js
  describe('API base URL', function() {
    it('should parse the local server URL');

    it('should parse API_BASE_URL if config base URL undefined');
  });
```

In the `should parse API_BASE_URL if config base URL undefined` test, add a
function that creates a new `var githubClient = new GitHubClient` instance.
Then implement both tests by validating `url.format(githubClient.baseurl)`.

## Check your work

By this point, all of the `GitHubClient` tests should be passing:

```sh
$ npm test -- --grep '^GitHubClient '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^GitHubClient "

[12:17:55] Using gulpfile .../unit-testing-node/gulpfile.js
[12:17:55] Starting 'test'...


  GitHubClient
    ✓ should successfully file an issue
    ✓ should fail to make a request if the server is down
    ✓ should receive an error when filing an issue
    API base URL
      ✓ should parse the local server URL
      ✓ should parse API_BASE_URL if config base URL undefined


  5 passing (48ms)

[12:17:55] Finished 'test' after 140 ms
```

Now that you're finished, compare your solutions to the code in
[`solutions/03-github-client/lib/github-client.js`]({{ site.baseurl }}/solutions/03-github-client/lib/github-client.js)
and
[`solutions/03-github-client/test/github-client-test.js`]({{ site.baseurl }}/solutions/03-github-client/test/github-client-test.js).

At this point, `git commit` your work to your local repo. After you do, copy
the `github-client.js` file from `solutions/03-github-client/lib` into
`exercises/lib` to see if it passes the test you wrote. Then run `git reset
--hard HEAD` and copy the test files instead to see if your implementation
passes. If a test case fails, review the section of this chapter pertaining to
the failing test case, then try to update your code to make the test pass.
