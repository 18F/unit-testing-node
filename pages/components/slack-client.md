---
permalink: /components/slack-client/
parent: Designing and testing the components
title: SlackClient class
---
The `SlackClient` class encapsulates the application's dependency on [Slack
APIs](https://api.slack.com/) and related npm packages. You can find it in the
['exercise/lib/slack-client.js`]({{ site.baseurl }}/exercise/lib/slack-client.js)
file.

If you don't have experience writing HTTP calls and launching test servers,
testing the `SlackClient` class is a great way to gain some experience. If
you're looking for more of a challenge, then move on to the next chapter.

If you've skipped to this chapter, you can establish the starting state of the
`exercise/` files for this chapter by running:

```sh
$ ./go set-slack-client
```

## What to expect

In production, Hubot uses the
[hubot-slack](https://www.npmjs.com/package/hubot-slack) adapter, which in
turn relies upon the
[slack-client](https://www.npmjs.com/package/slack-client) package. (At the
moment, it actualy depends on forked versions of those packages; more on that
in the [conclusion]({{ site.baseurl }}/conclusion).) These packages translate
[Slack Real Time Messaging API](https://api.slack.com/rtm) events such that
Hubot can route them to scripts that know how to handle them. These adapters
also provide an interface to translate things like user and channel
identifiers to their human-readable names.

As convenient as the interface provided by these packages is, given that it's
an external dependency, we should limit its exposure within our own code.
Hence, we introduce the `SlackClient` [facade
class](https://sourcemaking.com/design_patterns/facade).

This serves multiple purposes:

- All uses of the external dependency are documented via the methods on the
  facade.
- When the upstream interface changes, only this class should require any
  changes, minimizing the cost and risk of upgrades.
- We can use [dependency injection]({{ site.baseurl }}/concepts/dependency-injection/)
  in our tests _to model and control_ the external behavior.

We will also add methods to use the Slack Web API methods
[reactions.get](https://api.slack.com/methods/reactions.get) and
[reactions.add](https://api.slack.com/methods/reactions.add). There are npm
wrappers for the Slack Web API, but we will write our own code in this case to
[minimize dependencies](/concepts/minimizing-dependencies/). Since the code
required is relatively small and straightforward, it also provides a good
example of _how_ to write and test web API wrappers. We will learn to:

- manage HTTP bookkeeping
- learn the basics of using a
  [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
  to encapsulate an asynchronous operation
- learn how to test HTTP requests by launching a local HTTP test server
- learn how to use Promises with mocha and chai

## Starting to build `SlackClient`

The beginning of the `slack-client.js` file, where the `SlackClient`
constructor is defined, looks like this:

```js
/* jshint node: true */

'use strict';

module.exports = SlackClient;

function SlackClient(robotSlackClient) {
  this.client = robotSlackClient;
}

SlackClient.prototype.getChannelName = function(channelId) {
  return this.client.getChannelByID(channelId).name;
};
```

At the moment the class is a very thin wrapper over the Slack interface that
we used in the [`Rule` class]({{ site.baseurl }}/components/rule/). As the
parameter name would suggest, `robotSlackClient` would be the real client
object that we receive from the live Hubot instance. We're wrapping
`getChannelByID()`, which is the method required to implement
`Rule.channelMatches()`. What's more, we're encapsulating the fact that all
that is required from the `Channel` object returned by the method is its
`name` property.

## Refactoring `Rule.channelMatches()`

This facade is so thin that there's little use in writing tests directly for
it at this point. Instead, let's replace the direct use of the `slack-client`
interface in our `Rule` class with a call to `SlackClient.getChannelName()`.
This will both exercise the facade and ensure the `Rule` class is using it
properly.

We'll start by updating our `Rule` test to instantiate a `SlackClient`,
passing the Slack client stub to the `SlackClient` constructor. Start by
adding the following line to the `require()` block at the top of
`exercise/test/rule-test.js`:

```js
var SlackClient = require('../lib/slack-client');
```

Then let's rename `SlackClientStub` to `SlackClientImplStub`. This is to make
clear that the fake object is for the actual implementation object, not for
our `SlackClient` facade. You should be able to use your editor's global
search and replace function for this; then run the tests to ensure everything
passes. Again, to run just the `Rule` tests:

```sh
$ npm test -- --grep '^Rule '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Rule "

[19:38:39] Using gulpfile .../unit-testing-node/gulpfile.js
[19:38:39] Starting 'test'...


  Rule
    ✓ should contain all the fields from the configuration
    ✓ should match a message from one of the channelNames
    ✓ should ignore a message if its name does not match
    ✓ should match a message from any channel
    ✓ should ignore a message if its channel doesn't match


  5 passing (7ms)

[19:38:39] Finished 'test' after 73 ms
```

In the same fashion, update every test from this:

```js
        slackClient = new SlackClientImplStub('...')
```

to this:

```js
        slackClientImpl = new SlackClientImplStub('...')
```

Run the tests again. Everywhere `new SlackClientImplStub()` is called, add a
new declaration after it:

```js
        slackClient = new SlackClient(slackClientImpl);
```

Ensure the tests still pass. Now, change every `rule.match()` call from:

```js
        expect(rule.match(message, slackClientImpl))
```

to:

```js
        expect(rule.match(message, slackClient))
```

Now when you run the tests, you should see the following failures:

```sh
$ npm test -- --grep '^Rule '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Rule "

[14:02:27] Using gulpfile .../unit-testing-node/gulpfile.js
[14:02:27] Starting 'test'...


  Rule
    ✓ should contain all the fields from the configuration
    1) should match a message from one of the channelNames
    ✓ should ignore a message if its name does not match
    ✓ should match a message from any channel
    2) should ignore a message if its channel doesn't match


  3 passing (10ms)
  2 failing

  1) Rule should match a message from one of the channelNames:
     TypeError: slackClient.getChannelByID is not a function
    at Rule.channelMatches (exercise/lib/rule.js:26:34)
    at Rule.match (exercise/lib/rule.js:16:10)
    at Context.<anonymous> (exercise/test/rule-test.js:55:17)


  2) Rule should ignore a message if its channel doesn't match:
     TypeError: slackClient.getChannelByID is not a function
    at Rule.channelMatches (exercise/lib/rule.js:26:34)
    at Rule.match (exercise/lib/rule.js:16:10)
    at Context.<anonymous> (exercise/test/rule-test.js:90:17)




[14:02:27] 'test' errored after 66 ms
[14:02:27] Error in plugin 'gulp-mocha'
Message:
    2 tests failed.
npm ERR! Test failed.  See above for more details.
```

This is good news! The tests that actually exercise the call to
`getChannelByID()` fail as they should. Now update the `Rule.channelMatches()`
implementation to use the new `getChannelName()` method of the `SlackClient`
facade. Run the tests and ensure that they now pass.

## Gaining a little extra confidence in `SlackClient`

We've done a good job of testing the `Rule` class in complete isolation from
the `slack-client` library. However, there's an opportunity to gain a little
extra confidence that our `SlackClient` is conforming to the correct interface.
We'll do so by updating `SlackClientImplStub.getChannelByID()` to use an
_actual_ instance of `Channel` from the `slack-client` package.

The real `Channel` implementation encapsulates data that we need to access via
our `SlackClient` facade. It does not have any complex behavior or
dependencies. By tying our `SlackClientImplStub` to an actual external
implementation class, we gain confidence that our fake is a suitable facsimile
for the real thing. Also, it will _only_ be used to instantiate `SlackClient`
classes in our tests; the code under test is not affected at all.

Start by adding the following line to the top of the test file:

```js
var Channel = require('slack-client/src/channel');
```

Notice that you can inspect the actual implementation of this class by opening
`node_modules/slack-client/src/channel.js`. This module is actually written in
CoffeeScript, and is compiled to JavaScript upon publishing the npm. You can
inspect the original code at
[https://github.com/slackhq/node-slack-client](https://github.com/slackhq/node-slack-client)
in the `src/channel.coffee` file.

Now update `SlackClientImplStub.getChannelByID()` to return:

```js
  return new Channel(this, { name: this.channelName });
```

Run the tests again to ensure that they continue to pass.

## <a name="to-isolate-or-not"></a>To isolate or not to isolate?

We could test `SlackClient.getChannelName()` in isolation, using the
`SlackClientImplStub`, then create a stub for our new `SlackClient` class to
use in our `Rule` test. However, since `SlackClient` is so small and
straightforward, testing its behavior via the `Rule` tests proves highly
convenient. We gain that one extra bit of confidence that we will catch
incompatible `Channel` interface changes, without having to add a new test.

This does increase the amount of internal code exercised by the test, when we
usually want to decrease it at the unit level. We've also added a _real_
dependency on the `Channel` class from the `slack-client` package. Still,
given how thin the facade is, exercising this code in the `Rule` test
introduces minimal extra dependencies that cost very little. It also expands
the scope of the test only very, very slightly.

Consequently, adding an extra test and test double when the existing
`SlackClientImplStub` and `Rule` tests suffice seems of dubious benefit. Test
doubles should help to strike the right balance between complexity of test
setup and confidence that enough code is exercised by each test. Don't hold
back when you need them, but don't use them if you don't have to.

## The difference between a tutorial and the real thing

At this point, we could begin writing and testing our `Middleware` class to
pull these three early pieces together, before implementing the Slack API
business. In fact, you're welcome to begin doing so right now if you like.
When developing a program for real, it's not only perfectly OK to jump back
and forth between different pieces, it's actually quite normal.

However, for the sake of narrative clarity, we'll continue tackling this
program one class at a time. Even though the actual application was originally
developed in a fairly disjoint fashion, this linear presentation of ideas
should prove easier to follow.

## Designing the Slack Web API interface

Now we're going to add some real, nontrivial behavior to our `SlackClient`
class to implement the Slack Web API calls to
[`reactions.get`](https://api.slack.com/methods/reactions.get) and
[`reactions.add`](https://api.slack.com/methods/reactions.add). However, the
first thing to realize about the two calls are their similarities:

- Both will use the HTTP GET method. (The [Slack Web API calling
  conventions](https://api.slack.com/web) imply that POST is also an option,
  but we'll stick to GET.)
- Both have three parameters in common: `token`, which is the Slack user's API
  token from `process.env.HUBOT_SLACK_TOKEN`; and `channel` and `timestamp`,
  which uniquely identify a message. `reactions.add` will add the `name`
  parameter to indicate which emoji reaction to add to the specified message.
- Both HTTP methods will return a JSON payload with an `ok:` property which
  will be `true` on success. When `ok:` is `false`, there will be an `error:`
  property describing the problem.
- Even when `ok:` is `false`, the [HTTP status
  code](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2.1) will
  still be `200 OK`.

Given the similarity between the calls, the corresponding `getReactions()` and
`addSuccessReaction()` methods we'll add to the `SlackClient` will make use of
the same underlying API functions. They will both pass in objects that will
comprise the request query string parameters, and both return the JSON payload
parsed from the HTTP response.

In fact, let's sketch out these methods now:

```js
SlackClient.prototype.getReactions = function(channel, timestamp) {
  return makeApiCall(this, 'reactions.get',
    { channel: channel, timestamp: timestamp });
};

SlackClient.prototype.addSuccessReaction = function(channel, timestamp) {
  return makeApiCall(this, 'reactions.add',
    { channel: channel, timestamp: timestamp, name: this.successReaction });
};

function makeApiCall(that, method, params) {
}
```

Note that `makeApiCall` is not a member of `SlackClient`, and that its first
parameter, `that`, is actually the `this` reference from the `SlackClient`
methods. This is because `makeApiCall` is going to launch an asynchronous HTTP
request, and [`this` is redefined for callback functions defined inside other
functions](http://javascript.crockford.com/private.html). Translating `this`
to `that` here sidesteps the problem, and having `makeApiCall` private to the
module keeps the `SlackClient` interface narrow.

## Passing `Config` values to the `SlackClient`

You may recall the `slackTimeout` and `successReaction` properties from the
`Config` class's schema. To gain access to them, let's add a `config`
parameter to the `SlackClient` constructor:

```js
function SlackClient(robotSlackClient, config) {
  this.client = robotSlackClient;
  this.timeout = config.slackTimeout;
  this.successReaction = config.successReaction;
}
```

## To default, or not to default?

If you run the `Rule` tests now, most will fail because there is no `config`
value defined for any of the `SlackClient` constructors. The easy way to get
the tests to pass again would be to add this is the first line of the
`SlackClient`:

```js
  config = config || {};
```

Try it; it works. However, we now run the danger of creating `SlackClient`
objects that don't have data we think they should have. Both `slackTimeout`
and `successReaction` are required fields of the `Config` schema. Even if
`Rule` behavior isn't depending on any `Config`-defined `SlackClient` behavior
now, that may not always be the case.

It's better to allow this code to fail when `config` is undefined than to take
a shortcut to get the tests to pass. If the `Rule` tests become brittle due to
configurable `SlackClient` behavior, we may revisit [whether or not to use a
test double](#to-isolate-or-not) for `SlackClient` itself.

However, since the `Rule` tests _currently_ don't depend on any configurable
behavior, we can take a _slight_ shortcut and import the `test-config.json`
file directly:

```js
var config = require('./helpers/test-config.json');
```

Then update all of these calls:

```js
        slackClient = new SlackClient(slackClientImpl)
```

to this:

```js
        slackClient = new SlackClient(slackClientImpl, config)
```

Now run the `Rule` tests to confirm they all pass.

## HTTP request bookkeeping

Node.js fortunately has all the HTTP and HTTPS support we need in these
standard library modules:

- [http](https://nodejs.org/api/http.html)
- [https](https://nodejs.org/api/https.html)
- [querystring](https://nodejs.org/api/querystring.html)

So let's start by adding the following `require` statements to the top of the
file:

```js
var http = require('http');
var https = require('https');
var querystring = require('querystring');
```

There's actually two more properties we need to add to the `SlackClient`
object. In the tests we're about to write, we'll want to send requests to
`http://localhost`. In production, however, the `SlackClient` needs to send
requests to `https://slack.com/api/`. Let's encode the production defaults by
adding the following to the constructor:

```
  this.protocol = 'https:';
  this.host = 'slack.com';
```

For our purposes, the `options` argument of both
[`http.request()`](https://nodejs.org/api/http.html#http_http_request_options_callback) and
[`https.request()`](https://nodejs.org/api/https.html#https_https_request_options_callback)
are identical. So let's add a utility function to compose options from a
`SlackClient` instance, the Slack Web API method name, and the API method
parameters:

```js
function getHttpOptions(that, method, queryParams) {
  return {
    protocol: that.protocol,
    host: that.host,
    port: that.port,
    path: '/api/' + method + '?' + querystring.stringify(queryParams),
    method: 'GET'
  };
}
```

Note the addition of `port: that.port`. When `port:` is undefined, the request
uses the default port for HTTP (80) or HTTPS(443). In our tests, we will
launch a local HTTP server with a dynamically-assigned port. We'll assign this
port value as a property of the `SlackClient` instance under test. In
`getHttpOptions`, that dynamic port value will then propagate to this options
object.

## HTTP vs. HTTPS

One more detail until we get to the meat of making our API request: Switching
between HTTP in our tests and HTTPS in production. Recall that we imported
both the `http` and `https` modules from the Node.js standard library.
Recall that both have a `request` function that accepts the same set of HTTP
options that we will build using `getHttpOptions()`. Also recall that we
assigned the default value `this.protocol = 'https:'` in the `SlackClient`
constructor.

In our tests, we will assign `http:` to the `protocol` property of a
`SlackClient` instance under test. So to ensure we're using the correct
library in either our test or in production, add the following as the first
line of `makeApiCall`:

```js
function makeApiCall(that, method, params) {
  var requestFactory = (that.protocol === 'https:') ? https : http;

  // We'll continue with the rest of the implementation here shortly.
}
```

## Promises, Promises

[`Promises`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
represent asynchronous operations that will either _resolve_ to a value or be
_rejected_ with an error. A series of `Promise` objects may be chained
together to execute asynchronous operations in a way that resembles a series
of synchronous function calls. Plus, a single error handler can catch errors
arising from any link in the `Promise` chain.

Naturally, `Promise`s are a great fit for making a HTTP requests, and
especially a series of HTTP requests. Let's start fleshing out `makeApiCall`
by returning a `Promise`:

```js
function makeApiCall(that, method, params) {
  var requestFactory = (that.protocol === 'https:') ? https : http;

  return new Promise(function(resolve, reject) {
    // We'll fill in the actual request implementation here shortly.
  });
}
```

The function passed to the `Promise` constructor takes two callbacks as
parameters:

- `resolve`: called when the `Promise` completes its work successfully,
  possibly with arguments
- `reject`: called when the `Promise` fails to complete its work, usually
  with an [`Error`](https://nodejs.org/api/errors.html) argument

## Making the HTTP request

Let's begin filling in the implementation of the `Promise` to make our HTTP
(or HTTPS) request:

```js
  return new Promise(function(resolve, reject) {
    var httpOptions, req;

    params.token = process.env.HUBOT_SLACK_TOKEN;
    httpOptions = getHttpOptions(that, method, params);

    req = requestFactory.request(httpOptions, function(res) {
      handleResponse(method, res, resolve, reject);
    });

    // We'll add the rest of the request handling here shortly.
  };
```

A few things to notice about this new block of code:

- We're adding a `token` property to the parameters passed in by the calling
  function. This is what grants us permission to the Slack API, automatically
  added here to every request. The value comes from the `HUBOT_SLACK_TOKEN`
  environment variable, accessible via
  [`process.env`](https://nodejs.org/api/process.html#process_process_env).
- Using `that` ensures that we're accessing our `SlackClient` instance, since
  `this` in this context is the `makeApiCall` function itself.
- `requestFactory` will dispatch to either `http.request()` or
  `https.request()`. The polymorphism afforded by the earlier assignment to
  `requestFactory` avoids the need for a conditional here, making the
  algorithm easier to follow. This is related to the
  [replace conditional with polymorphism refactoring](http://refactoring.com/catalog/replaceConditionalWithPolymorphism.html),
  except we started with polymorphism instead of refactoring the conditional
  away.
- We're passing a callback to `requestFactory.request()` that
  delegates to a function we've yet to write, `handleResponse`. This function
  will have access to the `resolve` and `reject` callbacks passed to the
  outer `Promise` callback.

## `Promise` gotcha #0: not calling `resolve` or `reject`

The first thing to remember about `Promises` is that you _must_ call one of
`resolve` or `reject` in order to conclude the process. These are analogous to
`return` or `throw`, respectively. The `Promise` will happily run to
completion if you do `return` or `throw`, but the code waiting on the
`Promise` will never see the result.

A less-than-perfect analogy (since Node.js is single threaded) is to think of
a `Promise` as a new thread, and `resolve` and `reject` the synchronization
mechanisms. As we see with the call to `handleResponse`, these callbacks can
be delegated to other functions as arguments. The code launching the `Promise`
doesn't care when `resolve` or `reject` is called, or by what, only that
they're called so the process can resume.

## Finishing the HTTP request

We've got just a tiny bit more to do to complete our HTTP(S) request. Add the
following to finish the `Promise` function:

```js
    req.setTimeout(that.timeout);
    req.on('error', function(err) {
      reject(new Error('failed to make Slack API request for method ' +
        method + ': ' + err.message));
    });
    req.end();
```

`req` is a
[http.ClientRequest](https://nodejs.org/api/http.html#http_class_http_clientrequest),
which implements the
[`WritableStream` interface](https://nodejs.org/api/stream.html#stream_class_stream_writable),
itself derived from
[`EventEmitter`](https://nodejs.org/api/events.html#events_class_events_eventemitter).
Here we're setting a timeout (in milliseconds) defined by our `Config`
instance. Then we set up an error handler in case the request never reaches the
server, or the response never arrives prior to `that.timeout`. Notice that
this handler creates an `Error` object and passes it as an argument to the
`Promise` function's `reject`callback. Finally, we send the request with
`req.end()`.

## Delegating to `handleResponse`

All that's left now is to implement the `handleResponse` delegate. Let's start
by adding this to our module:

```js
function handleResponse(method, res, resolve, reject) {
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
response. This is the last piece we need to finish the `SlackClient`:

```js
  res.on('end', function() {
    var parsed;

    if (res.statusCode >= 200 && res.statusCode < 300) {
      parsed = JSON.parse(result);

      if (parsed.ok) {
        resolve(parsed);
      } else {
        reject(new Error('Slack API method ' + method + ' failed: ' +
          parsed.error));
      }
    } else {
      reject(new Error('received ' + res.statusCode +
        ' response from Slack API method ' + method + ': ' + result));
    }
  });
```

A few things to notice about this handler:

- We _only_ accept [200 class HTTP status
  codes](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.2). In
  practice, it should always be 200, but it shouldn't hurt to be slightly
  flexible here.
- If the status code isn't in the 200 class, we call `reject` with an `Error`
  that contains the unparsed body of the request.
- We have to call
  [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
  on the body, then inspect the `ok:` parameter of the result to determine
  success or failure of the request.
- If `ok:` is `true`, we pass the parsed object to `resolve`. Otherwise we
  pass a new `Error` to `reject` containing the parsed object's `error:`
  message.

## Testing the API interaction with a local HTTP server

Now for the moment of truth! First, run `npm test` to ensure all the tests
still pass. (`npm run lint` would be a good idea, too.) Now run just the
`SlackClient` tests:

```sh
$ npm test -- --grep '^SlackClient '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^SlackClient "

[13:46:11] Using gulpfile .../unit-testing-node/gulpfile.js
[13:46:11] Starting 'test'...


  SlackClient
    getReactions
      ✓ should make a successful request


  1 passing (5ms)

[13:46:11] Finished 'test' after 91 ms
```

## `Promise` gotcha #1: not returning the `Promise`

## Rolling our own until we upgrade

As mentioned at the beginning of this chapter, most of what we've written here
may be replaced eventually by methods added to slack-client and hubot-slack.
It's also possible we could've added support directly to these official
packages first, since the code for both is open source.

Even so, the important thing is that our use of these external interfaces is
largely contained within this single module. Read the
[forking and contributing upstream]({{ site.baseurl }}/concepts/forking-and-contributing-upstream/)
chapter for a more thorough discussion of the factors regarding the decision
to write `SlackClient` this way.

## Check your work

By this point, all of the `SlackClient` tests should be passing:

```sh
```

Now that you're all finished, compare your solutions to the code in
[`solutions/02-slack-client/lib/slack-client.js`]({{ site.baseurl }}/solutions/02-slack-client/lib/slack-client.js)
and
[`solutions/02-slack-client/test/slack-client-test.js`]({{ site.baseurl }}/solutions/02-slack-client/test/slack-client-test.js).

You may wish to `git commit` your work to your local repo at this point. After
doing so, try copying the `config.js` file from `solutions/02-slack-client`
into `exercises` to see if it passes the test you wrote. Then run `git reset
--hard HEAD` and copy the test files instead to see if your implementation
passes.
