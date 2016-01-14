---
permalink: /components/github-client/
parent: Designing and testing the components
title: GitHubClient class
---
The `GitHubClient` class encapsulates the application's dependency on the
[GitHub API](https://api.slack.com/). You can find it in the
['exercise/lib/github-client.js`]({{ site.baseurl }}/exercise/lib/github-client.js)
file.

If you don't have experience writing HTTP calls and launching test servers,
testing the `GitHubClient` class is a great way to gain some experience. If
you're looking for more of a challenge, then move on to the next chapter.
If you've skipped to this chapter, you can establish the starting state of the
`exercise/` files for this chapter by running:

```sh
$ ./go set-github-client
```

## What to expect

After receiving a `reaction_added` event and fetching the all the message
reactions via `SlackClient.getReactions`, we will use the [GitHub API to
create a new issue](https://developer.github.com/v3/issues/#create-an-issue).
Like `SlackClient`, this class is a [facade
class](https://sourcemaking.com/design_patterns/facade) that limits the
exposure of the GitHub API to our application's code.

To reiterate the advantages of a facade:

- All uses of the external dependency are documented via the methods on the
  facade.
- When the upstream interface changes, only this class should require any
  changes, minimizing the cost and risk of upgrades.
- We can use [dependency injection]({{ site.baseurl }}/concepts/dependency-injection/)
  in our tests _to model and control_ the external behavior.

GitHub API wrapper packages exist, but since this is the only API call our
application will make, we'll write our own code to [minimize
dependencies](/concepts/minimizing-dependencies/). Since the code required is
relatively small and straightforward, it also provides a good example of _how_
to write and test web API wrappers.

This class is actually a little smaller than `SlackClient`. However, whereas
`SlackClient` makes a GET request with all its information encoded in the
URL, `GitHubClient` makes a POST request that requires specific HTTP headers.
We will learn to:

- manage HTTP bookkeeping
- learn the basics of using a
  [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
  to encapsulate an asynchronous operation
- learn how to test HTTP requests by launching a local HTTP test server
- learn how to use Promises with mocha and chai

## Starting to build `GitHubClient`

The beginning of the `slack-client.js` file, where the `GitHubClient`
constructor is defined, looks like this:

```js
/* jshint node: true */

'use strict';

module.exports = GitHubClient;

function GitHubClient(config) {
  this.user = config.githubUser;
  this.timeout = config.githubTimeout;
  this.protocol = 'https:';
  this.host = 'api.github.com';
}

GitHubClient.prototype.fileNewIssue = function(/* metadata, repository */) {
};
```

We see that the constructor pulls the GitHub-related parameters from a
`Config` object. It also sets the `protocol` and `host` properties such that
the `GitHubClient` will make calls to `https://api.github.com` by default.
However, in our tests, we will override these properties so that requests go
to `http://localhost` instead.

## Writing the request function

Much like we did with `SlackClient`, let's make `fileNewIssue` a thin wrapper
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

Note that `makeApiCall` is not a member of `GitHubClient`, and that its first
parameter, `client`, is actually the `this` reference from the `GitHubClient`
methods. `makeApiCall` is going to define a [nested
function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#Nested_functions_and_closures) to launch an
asynchronous HTTP request. Were `makeApiCall` a member of `GitHubClient`,
[inside the nested handler, `this` would not refer to the `GitHubClient`
object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#Lexical_this).
This can prove very confusing, especially to people with experience in
object-oriented languages. Translating `this` to `client` in this way
sidesteps the problem, and having `makeApiCall` private to the module keeps
the `GitHubClient` interface narrow.

## Selecting HTTP vs. HTTPS

Let's import the [`http`](https://nodejs.org/api/http.html) and
[`https`](https://nodejs.org/api/https.html) modules from the Node.js standard
library:

```js
var http = require('http');
var https = require('https');
```

Both have a `request` function that accepts the same set of HTTP options that
we will build using a helper function. So as the first step in implementing
`fileNewIssue`, let's select the correct library depending on whether the code
is running under test or in production:

```js
function makeApiCall(client, metadata, repository) {
  var requestFactory = (client.protocol === 'https:') ? https : http;
};
```

## Building the API method parameters

The `metadata` argument to `makeApiCall` will contain information from the
message that received the reaction from which to build the GitHub issue. It
will contain two properties: `title:`, constructed by the `Middleware` class,
and `url:`, which will be the permalink for the message.

The `repository` argument is name of the repository to which to post the
issue. This should be just the last component of the repository's GitHub URL
after the user or organization name specified by `Config.githubUser`. For
example, for `{{ site.repos[0].url }}`, this would be `{{ site.repos[0].url |
split:"/" | last }}`.

We'll use the `metadata` object to create the [issue creation API method
parameters](https://developer.github.com/v3/issues/#create-an-issue) as a JSON
object, encoded as a string in the request body:

```js
  var requestFactory = (this.protocol === 'https:') ? https : http,
      paramsStr = JSON.stringify({
        title: metadata.title,
        body: metadata.url
      });
```

## Building the HTTP options

The HTTP request is straightforward to build, if a little cumbersome. So let's
introduce a helper function:

```js
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
```

A few things to note here:

- We assign `port: client.port`. When `port:` is undefined, the request uses
  the default port for HTTP (80) or HTTPS(443). In our tests, we will launch a
  local HTTP server with a dynamically-assigned port. We'll assign this port
  value as a property of the `GitHubClient` instance under test. In
  `getHttpOptions`, that dynamic port value will then propagate to this
  options object.
- We [specify the GitHub API version in the `Accept`
  header](https://developer.github.com/v3/#current-version)
- Unlike with the Slack API, we [pass the GitHub API token in the
  `Authorization` header](https://developer.github.com/v3/#authentication).
  This token comes from the `HUBOT_GITHUB_TOKEN` environment variable,
  accessible via
  [`process.env`](https://nodejs.org/api/process.html#process_process_env).
- Unlike with the Slack API, we assign the `Content-Type` and `Content-Length`
  since the parameters (encoded as `paramsStr`) will appear in the request
  body as JSON.
- We calculate `Content-Length` using
  [`Buffer.byteLength`](https://nodejs.org/api/buffer.html#buffer_class_method_buffer_bytelength_string_encoding)
  rather than relying on `paramsStr.length`, which may be smaller than the
  actual byte length due to multibyte characters.
- [GitHub requires the `User-Agent` header](https://developer.github.com/v3/#user-agent-required)
  which we've set to [the name and version of the
  program](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.43).

To import `packageInfo` properties that we use in the `User-Agent` definition,
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
_rejected_ with an error. This abstraction works especially for HTTP requests,
which are common asynchronous operations. For background, please see the
[`SlackClient` section on
`Promises`]({{ site.baseurl }}/components/slack-client/#promises),
as well as
[`Promise` gotcha #0]({{ site.baseurl }}/components/slack-client/#promises-gotcha-0)
and
[`Promise` gotcha #1]({{ site.baseurl }}/components/slack-client/#promises-gotcha-1).

Let's start fleshing out the rest of `makeApiCall` by defining a `Promise`:

```js
function makeApiCall(client, metadata, repository) {
  var requestFactory = (client.protocol === 'https:') ? https : http,
      paramsStr = JSON.stringify({
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
We can pass the result of a successful operation to `resolve`, and an
[`Error`](https://nodejs.org/api/errors.html) or similar object to `reject`.
Now let's make our request:

```js
  return new Promise(function(resolve, reject) {
    var httpOptions = getHttpOptions(client, repository, paramsStr),
        req = requestFactory.request(httpOptions, function(res) {
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
(which we'll fill in next). Also note:

- `req` is a
  [http.ClientRequest](https://nodejs.org/api/http.html#http_class_http_clientrequest),
  which implements the
  [`WritableStream` interface](https://nodejs.org/api/stream.html#stream_class_stream_writable),
  itself derived from
  [`EventEmitter`](https://nodejs.org/api/events.html#events_class_events_eventemitter).
- We've set a timeout, passed from `Config.githubTimeout`, to limit how long
  to wait before canceling the request.
- We've set an error handler in case the program fails to send the request,
  and pass an `Error` to `reject` to complete the operation.
- We finally send the request with `req.end`, passing `paramsStr` as the body
  of the request.

Also, take this opportunity to read [`Promise` gotcha #0: not calling
`resolve` or `reject`]({{ site.baseurl
}}/components/slack-client/#promises-gotcha-0) from the `SlackClient` chapter
before moving on.

## Delegating to `handleResponse`

All that's left now is to implement the `handleResponse` delegate. Let's start
by adding this to our module:

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
comes from `WritableStream` ensures each chunk of the JSON payload is passed as a UTF-8 string to the
[`'data'` event](https://nodejs.org/api/stream.html#stream_event_data).
The `'data'` event handler builds up our `result` string a piece at a time.

## Handling the completed HTTP response

The `'end'` event happens when we've finished receiving the entire server
response. This is the last piece we need to finish the `GitHubClient`:

```js
  res.on('end', function() {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        resolve(JSON.parse(result).html_url);  // jshint ignore:line
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

- We _only_ accept [200 class HTTP status
  codes](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2).
- If the status code isn't in the 200 class, we call `reject` with an `Error`
  that contains the unparsed body of the request.
- We have to call
  [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
  on the body. If successful, the `Promise` for the HTTP request will resolve
  to the `html_url` value from the response.
- If the status code was not in the 200 class, or if the response failed to
  parse, we reject the `Promise` with an error containing the body of the
  request.

## Preparing to test the API interaction

Now for the moment of truth! First add the following to the top of the
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
and `repository` as arguments, and resolves to `ISSUE_URL`. Since it's likely
we'll want to use the same sample data through our test suite, let's add the
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

Using the `helpers` module implies that we need to add the following to the
top of our test file:

```js
var helpers = require('./helpers');
```

## `Promise`-based assertions

Also notice that the test assertion starts with `return` and ends with
`.should.become(helpers.ISSUE_URL)`. This assertion is _returning a
`Promise`_. This is a combination of two features:

- The Mocha framework [will detect returned Promises and wait for them to
  become resolved or rejected](https://mochajs.org/#working-with-promises).
- The Chai-as-Promised extension of the Chai assertion library provides
  [expect/should-style assertions](https://www.npmjs.com/package/chai-as-promised#should-expect-interface).

To enable these features, add the following lines to the top of the test file:

```js
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);
```

# Defining `githubClient`

Now we can instantiate our `GitHubClient` instance:

```js
describe('GitHubClient', function() {
  var githubClient;

  before(function() {
    githubClient = new GitHubClient(helpers.baseConfig());
    githubClient.protocol = 'http:';
    githubClient.host = 'localhost';
  });

  it('should successfully file an issue', function() {
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.eventually.equal(helpers.ISSUE_URL);
  });
});
```

A few things are happening here:

- We instantiate the configuration via `helpers.baseConfig()`. We could also
  `require('./helpers/test-config.json')` as in the `SlackClient` test, but
  we've opted to take a different path here. The result, in this case, is the
  same.
- As mentioned earlier, we change the `protocol` and `host` parameters so the
  `GitHubClient` will send requests to `http://localhost`, not
  `https://slack.com`.
- The `GitHubClient` state affecting its behavior (`protocol` and `host`) is
  constant across every test. Consequently, we only create one instance in the
  `before` block, rather than one per test in `beforeEach`.

At this point, let's run our test:

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

This is what we _want_ to see at this point, because we haven't launched a
`localhost` HTTP server yet.

## Broken `Promises`

Before moving on to the next section, remove the `return` keyword from the
test assertion, then run the test to see what happens:

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

In this case, what happened is that **we forgot to `return` the new Promise**.
Please review [`Promise` gotcha #1: not returning the
`Promise`]({{ site.baseurl }}/components/slack-client/#promises-gotcha-1) from
the `SlackClient` chapter for more background. Restore the missing `return`
statement and run the test again to ensure it fails before moving on.

## Testing the error case

Before fixing the test, let's actually copy it and make a new test out of it:

```js
  it('should fail to make a request if the server is down', function() {
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.be.rejectedWith('failed to make GitHub API request:');
  });
```

Run the tests and make sure that this one passes. Now we can remain confident
that if the real GitHub API server is down, our `GitHubClient` will report the
error instead of silently failing.

## Updating the `ApiStubServer` to handle POST requests and check HTTP headers

Now for the fun part: updating [the `ApiStubServer` that we implemented in the
`SlackClient`
chapter]({{ site.baseurl }}/components/slack-client/#api-stub-server)! Please
review that section for background on the features and implementation details.

At the moment, that server does most of what we need, but only handles HTTP
GET requests and doesn't check HTTP headers. The first thing we will do is
refactor our checks into a new function `compareParamsAndRespond`, so the
server implementation now looks like this:

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
the tests still pass. We haven't changed the behavior of the `ApiStubServer`.
However, with `compareParamsAndRespond` extracted, we can better share that
code between the `GET` case needed by `SlackClient` and the `POST` case needed
by `GitHubClient`. We'll first put this new structure in place within the
`http.Server` callback within the `ApiStubServer` constructor:

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
paramters from the JSON object encoded in the body. Since `req` implements the
[`WritableStream` interface](https://nodejs.org/api/stream.html#stream_class_stream_writable),
unlike the `GET` example, we have to piece together the body before parsing
the JSON object and calling `compareParamsAndRespond`.

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
we're testing it using the actual application. If we were to reuse this in
other applications, we would want to make a well-tested npm out of it. Or
perhaps we would just use an existing library like
[`nock`](https://www.npmjs.com/package/nock).

The reason we roll our own here is to provide a bit of insight into how to
write basic HTTP testing servers using the Node.js standard library.

## Check your work

By this point, all of the `GitHubClient` tests should be passing:

```sh
```

Now that you're all finished, compare your solutions to the code in
[`solutions/03-github-client/lib/github-client.js`]({{ site.baseurl }}/solutions/03-github-client/lib/github-client.js)
and
[`solutions/03-github-client/test/github-client-test.js`]({{ site.baseurl }}/solutions/03-github-client/test/github-client-test.js).

You may wish to `git commit` your work to your local repo at this point. After
doing so, try copying the `config.js` file from `solutions/03-github-client`
into `exercises` to see if it passes the test you wrote. Then run `git reset
--hard HEAD` and copy the test files instead to see if your implementation
passes.
