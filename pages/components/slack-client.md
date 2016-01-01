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
example of _how_ to write and test web API wrappers.

## Starting to build `SlackClient`

We'll start by defining a very thin wrapper over the Slack interface that we
used in the [`Rule` class]({{ site.baseurl }}/components/rule/). Copy this
implementation into `exercise/lib/slack-client.js`:

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

As the parameter name would suggest, `robotSlackClient` would be the real
client object that we receive from the live Hubot instance. We're wrapping
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
adding the following line to the `require()` block at the top of the file:

```js
var SlackClient = require('../lib/slack-client');
```

Then let's rename `SlackClientStub` to `SlackClientImplStub`. This is to make
clear that the fake object is for the actual implementation object, not for
our `SlackClient` facade. You should be able to use your editor's global
search and replace function for this; then run the tests to ensure everything
passes.

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

## To isolate or not to isolate?

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

## Testing



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
