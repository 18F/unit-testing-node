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
you're looking for more of a challenge, run the following commands, then move
on to the next chapter:

```sh
$ cp solutions/02-slack-client/lib/slack-client.js exercise/lib/slack-client.js
$ cp solutions/02-slack-client/test/slack-client-test.js exercise/test/slack-client-test.js
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

- When the upstream interface changes, only this class should require any
  changes.
- All uses of the external dependency are documented via the methods on the
  facade.
- We can use [dependency injection]({{ site.baseurl }}/concepts/dependency-injection/)
  in our tests _to model and control_ the external behavior.

We will also add methods to use the Slack Web API methods
[reactions.get](https://api.slack.com/methods/reactions.get) and
[reactions.add](https://api.slack.com/methods/reactions.add). There are npm
wrappers for the Slack Web API, but we will write our own code in this case to
[minimize dependencies](/concepts/minimizing-dependencies/). Since the code
required is relatively small and straightforward, it also provides a good
example of _how_ to write and test web API wrappers.

## Introducing the `SlackClient`

For now, we're going to implement a very thin [facade
class](https://sourcemaking.com/design_patterns/facade) over the Slack
interface that we will call `SlackClient`. We will explore this class in-depth
and flesh it out further in the next chapter. But for now, let's copy this
implementation into `exercise/lib/slack-client.js`:

```js
/* jshint node: true */
'use strict';

function SlackClient(robotSlackClient) {
  this.client = robotSlackClient;
}

SlackClient.prototype.getChannelName = function(channelId) {
  return this.client.getChannelByID(channelId).name;
};
```

As the parameter name would suggest, `robotSlackClient` would be the real
client object that we receive from the live Hubot instance. It has a method
called `getChannelByID` that does exactly what we need to do to make
`channelMatches()` work.

## Judgment call

Again, we could create a stub for this `SlackClient` class to use in our
`Rule` test. However, since the class is so small and straightforward, we will
instead stub the `robotSlackClient` object on which it depends. This increases
the amount of internal code exercised by the test, when we usually want to
decrease it at the unit level.

However, given how thin the facade is, exercising this code in the `Rule` test
introduces no extra dependencies and costs very little. Test doubles should
help to strike the right balance between complexity of test setup and
confidence that enough code is exercised by each test. Don't use them if you
don't have to, but don't hold back when you need them.

However, we _do_ still need to create a stub for this `robotSlackClient`.

## Introducing `FakeSlackClientImpl`

In contrast to the `SlackClient` class, we're actually going to use some real
production objects to implement the `FakeSlackClientImpl` class. Since we'll
reuse it and build it up further throughout the exercise, start by creating
the `exercise/test/helpers/fake-slack-client-impl.js` file:

```js
/* jshint node: true */

'use strict';

var Channel = require('slack-client/src/channel');

module.exports = FakeSlackClientImpl;

function FakeSlackClientImpl(channelName) {
  this.channelName = channelName;
}

FakeSlackClientImpl.prototype.getChannelByID = function(channelId) {
  this.channelId = channelId;
  // https://api.slack.com/types/channel
  return new Channel(this,
    { id: channelId, name: this.channelName, 'is_channel': true });
};
```

Notice that we're depending on the _actual_ `Channel` implementation from the
`slack-client` package. This class encapsulates data that we need to access
via our `SlackClient` facade; it does not have any complex behavior or
dependencies. By tying our `FakeSlackClientImpl` to actual external
implementation classes, we retain confidence that our fake is a suitable
facsimile for the real thing. Also, it will _only_ be used to instantiate
_SlackClient_ classes in our tests.

## A more controlled upgrade path

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
