---
title: Middleware class
---
The `Middleware` class is where all of the pieces we've built up so far get
integrated. It is the figurative brain and heart of the application. The name
refers to its role in implementing a piece of [Hubot receive
middleware](https://hubot.github.com/docs/scripting/#middleware). You can find
it in the
[`exercise/lib/middleware.js`]({{ site.baseurl }}/exercise/lib/middleware.js)
file.

If you've skipped ahead to this chapter, you can establish the starting state
of the `exercise/` files for this chapter by running:

```sh
$ ./go set-middleware
```

## What to expect

Thanks to the work we've done encapsulating configuration validation in the
`Config` class, rule matching logic in the `Rule` class, and API calls to
Slack and GitHub in the `SlackClient` and `GitHubClient` classes, `Middleware`
can focus squarely on the core application logic.

We also don't need to test all possible corner and error cases for those other
components, since they have been thoroughly tested in isolation. In fact, we
don't need to run any HTTP servers in the `Middleware` test, because we can
use [test
doubles](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html)
to simulate their behavior. This will make the `Middleware` tests easier to
write, to maintain, and to understand.

In short, we will learn to:

- build our core application object using [composition rather than
  inheritance]({{ site.baseurl }}/concepts/object-composition-vs-inheritance)
- write more controllable, maintainable, readable tests using test doubles and
  a technique known as [dependency
  injection]({{ site.baseurl }}/concepts/dependency-injection)
- use the [`sinon` library](http://sinonjs.org/) to create
  [test doubles](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html)
- learn how to use `Promises` with mocha and chai

## <a name="core-algorithm"></a>The core algorithm

`Middleware` implements the core algorithm of the application:

- Match an incoming `reaction_added` message against the rules.
- If a match is found, get a list of all of the reactions to the message.
- If there is no "success" reaction (defined in the configuration), file a
  GitHub issue.
- Add a "success" reaction to the message.
- Post the link to the GitHub issue in the channel containing the message.

Thanks to the other classes we've written, `Middleware` is not concerned with
the details handled by those classes. This makes the `Middleware` class itself
easier to implement, to understand, and especially easier to test.

## Starting to build `Middleware`

The beginning of the `middleware.js` file, where the `Middleware` constructor
is defined, looks like this:

```js
'use strict';

module.exports = Middleware;

function Middleware(config, slackClient, githubClient, logger) {
  this.rules = config.rules;
  this.successReaction = config.successReaction;
  this.slackClient = slackClient;
  this.githubClient = githubClient;
  this.logger = logger;
}

Middleware.prototype.execute = function(/* context, next, done */) {
};
```

There are two very important things to notice about the constructor. First,
the `rules`, `successReaction`, `slackClient`, `githubClient`, and `logger`
objects become properties of the `Middleware` object. Rather than directly
implement configuration validation, rule matching, HTTP request behavior, and
logging, we delegate handling of those detailed operations to each respective
object.

Neither does `Middleware` inherit any behavior from other objects. Every
dependency on behavior not implemented directly by `Middleware` itself is made
explicit by a method call on a collaborating object. This is an illustration of
[object composition]({{ site.baseurl }}/concepts/object-composition-vs-inheritance),
one of the core design principles that leads to more readable, more maintable,
more testable code.

The second thing to notice is that the `Middleware` object is not creating
these collaborating objects itself. Rather, these _dependencies_ are
_injected_ into the object by the code creating the `Middleware` object. The
finished application will configure the `Middleware` to use real `Config`,
`SlackClient`, and `GitHubClient` objects. However, our tests can use
alternate implementations of `SlackClient` and `GitHubClient` in particular to
exercise `Middleware` behavior without making actual Slack and GitHub API
calls. [Dependency injection]({{ site.baseurl }}/concepts/dependency-injection)
relies upon object composition to make it even easier to write focused,
targeted, isolated, stable, readable, maintainable, valuable automated tests.

## Creating `Rule` objects from `config.rules`

The first thing we need to do is promote the flat JSON objects from
`config.rules` to full-fledged `Rule` objects. The `Config` object has already
ensured that `config.rules` contains valid `Rule` specifications, so all we
have to do is map each specification to a behavior-rich object:

```js
var Rule = require('./rule');

// ...

function Middleware(config, slackClient, githubClient, logger) {
  this.rules = config.rules.map(function(rule) {
    return new Rule(rule);
  });
```

In contrast to our injected dependencies, our `Rule` objects are small,
straightforward, and do not rely on outside resources such as files, servers,
or timers. Should this somehow ever change, we may wish to extract the `Rule`
instantiation into a factory object. For the time being, however, it's
completely OK for `Middleware` to instantiate these objects directly, as
opposed to `slackClient`, `githubClient`, or `logger`.

## Understanding the `execute(context, next, done)` function signature

The `Middleware` object implements the [Hubot receive middleware
specification](https://hubot.github.com/docs/scripting/#middleware), which
defines the following arguments:

- **context**: for [receive
  middleware](https://hubot.github.com/docs/scripting/#receive-middleware-api),
  this contains a `response` property that itself contains the incoming
  `message` and a `reply` method to send a response message to the user
- **next**: a callback function that runs the next piece of middleware; must
  be called with **done** as an argument, or a function that eventually calls
  **done**
- **done**: a callback function taking no arguments that signals completion of
  middleware processing; typically passed as the sole argument to **next**,
  but a middleware function can call it to abort further processing

The first thing we will do is uncomment the arguments and pick apart the parts
of `context` that we need into separate variables:

```js
Middleware.prototype.execute = function(context, next, done) {
  var response = context.response,
      message = response.message.rawMessage;
}
```

## The `reaction_added` message format

The `message` variable holds the raw JSON object representing the
[`reaction_added` message](https://api.slack.com/events/reaction_added). These
messages will look like this:

```json
{
  "type": "reaction_added",
  "user": "U024BE7LH",
  "item": {
    "type": "message",
    "channel": "C2147483705",
    "ts": "1360782804.083113"
  },
  "reaction": "thumbsup",
  "event_ts": "1360782804.083113"
}
```

Note that, per the API documentation the `item` member can also be a `file` or
a `file_comment`. Our implementation will not handle those types, though the
actual application may eventually add support for them.

The message receiving the message is uniquely identified by the channel ID
(`channel`) and timestamp (`ts`). This is why we added those parameters to our
`SlackClient` methods that implement the
[`reactions.get`](https://api.slack.com/methods/reactions.get) and
[`reactions.add`](https://api.slack.com/methods/reactions.add) Slack API
calls.

## Finding the matching `Rule` for an incoming `reaction_added` message

We need to iterate through our array of `Rule` objects to find the `Rule` that
matches the incoming message. Let's import the `SlackClient` library and give
this behavior its own method:

```js
var SlackClient = require('./slack-client');

// ... existing implementation ...

Middleware.prototype.findMatchingRule = function(message) {
  var slackClient = this.slackClient;

  if (message && message.type === SlackClient.REACTION_ADDED &&
      message.item.type === 'message') {
    return this.rules.find(function(rule) {
      return rule.match(message, slackClient);
    });
  }
};
```

The first thing we do is assign `this.slackClient` to a new variable, since
[`this` will refer to a different object inside the
callback](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#Lexical_this).

Looking closely, we can see that there's also a new member to add to
`SlackClient`. Inside
[`exercise/lib/slack-client.js`]({{ site.baseurl }}/exercise/lib/slack-client.js)
add the following just below the constructor:

```js
// From: https://api.slack.com/events/reaction_added
// May get this directly from a future version of the slack-client package.
SlackClient.REACTION_ADDED = 'reaction_added';
```
This keeps with the theme of adding all Slack-related information and behavior
encapsulated within the `SlackClient` class. Of course, the most correct thing
would be to `require('slack-client')` and get the value that way. However, given
this is the only piece of information we need, we can [minimize
dependencies]({{ site.baseurl }}/concepts/minimizing-dependencies/) by
assigning this one constant value ourselves.

We wrap `this.rules.find` in a conditional to ensure that we call `Rule.match`
with a valid message. This could theoretically be part of the `Rule.match`
behavior itself. However, since the result of this check would remain the same
across all `Rule` objects for any message, it makes sense to implement it here.

## Testing `findMatchingRule`

Another benefit of writing this method first is that we can test its behavior
thoroughly and directly without calling `execute`. Since `execute` will be the
single function responsible for the entire application, it makes sense to
implement and test this step in isolation. [This will give us confidence that
all the corner cases are accounted for, without an exponential explosion in
the number of test
cases](http://googletesting.blogspot.com/2008/02/in-movie-amadeus-austrian-emperor.html).

Let's look at the first empty test case in
[`exercise/test/middleware-test.js`]({{ site.baseurl }}/exercise/test/middleware-test.js):

```js
describe('Middleware', function() {
  describe('findMatchingRule', function() {
    it('should find the rule matching the message', function() {
    });
  });
```

The first thing we need is to instantiate a `Middleware` instance in our test
fixture. We'll also instantiate `Config`, `SlackClient`, `GitHubClient`, and
`Logger` objects. Add all of the necessary `require` statements, configure the
chai assertions, and then create `config`, `slackClient`, `githubClient`,
`logger`, and `middleware`:

```js
var Middleware = require('../lib/middleware');
var Config = require('../lib/config');
var GitHubClient = require('../lib/github-client');
var SlackClient = require('../lib/slack-client');
var Logger = require('../lib/logger');
var helpers = require('./helpers');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

var expect = chai.expect;
chai.should();
chai.use(chaiAsPromised);

describe('Middleware', function() {
  var config, slackClient, githubClient, logger, middleware;

  beforeEach(function() {
    config = new Config(helpers.baseConfig());
    slackClient = new SlackClient(undefined, config);
    githubClient = new GitHubClient(config);
    logger = new Logger(console);
    middleware = new Middleware(config, slackClient, githubClient, logger);
  });
```

Notice that we're instantiating `logger` using the `console` object. It
contains `info` and `error` methods just like the `robot.logger` that the real
application will use. As we'll see later, we shoudn't actually invoke any of
the `console` methods. If it happens by accident, we'll see the unexpected
output printed within the test results.

## Introducing the `sinon` test double library

Notice that we leave the robotSlackClient argument to the `SlackClient`
constructor undefined. Since `SlackClient` is already thoroughly tested, we
can emulate its behavior without defining all (or any) of its dependencies by
using a
[test double](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html).
We'll now introduce the [`sinon` library](http://sinonjs.org/) to create a
test doubles for `SlackClient`.

`sinon` is a library that can create stub, fake, and mock objects for you.
Though we wrote our own
[`SlackClientImplStub`]({{ site.baseurl }}/exercises/test/helpers/slack-client-impl-stub.js)
when testing the `Rule` class, we will need more objects and more behavior
when testing `Middleware`. As a result, we'll use `sinon` to create a double
for `SlackClient` in this test, rather than extracting `SlackClientImplStub`
into `test/helpers`.

The first step is to add the following `require` statement:

```js
var sinon = require('sinon');
```

Then, inside the nested fixture for `findMatchingRule` tests, add the
following to set up and tear down the test double for the
`slackClient.getChannelName` method:

```js
  describe('findMatchingRule', function() {
    var getChannelName, message;

    beforeEach(function() {
      getChannelName = sinon.stub(slackClient, 'getChannelName');
      getChannelName.returns('not-any-channel-from-any-config-rule');
      message = helpers.reactionAddedMessage();
    });

    afterEach(function() {
      getChannelName.restore();
    });
```

Here we create a [stub](http://sinonjs.org/docs/#stubs) for the
`getChannelName` method of the `slackClient` object. We can control what the
stub returns when it's called via `returns`. There are many other features of
sinon stubs, and you are welcome to experiment with other methods beyond
what's covered in this chapter.

## `reaction_added` test data

The final thing we need is a `reaction_added` message instance. Now that we're
familiar with the pattern of adding test data to our `test/helpers` package,
let's add the following to `exercise/test/helpers/index.js`:

```js
var SlackClient = require('../../lib/slack-client');

exports = module.exports = {
  REACTION: 'evergreen_tree',
  USER_ID: 'U5150OU812',

  // ...existing declarations...

  reactionAddedMessage: function() {
    return {
      type: SlackClient.REACTION_ADDED,
      user: exports.USER_ID,
      item: {
        type: 'message',
        channel: exports.CHANNEL_ID,
        ts: exports.TIMESTAMP
      },
      reaction: exports.REACTION,
      'event_ts': exports.TIMESTAMP
    };
  },

  // ...existing declarations...
```

## The `findMatchingRule` test suite

With this helper data in place, we can now implement our first test:

```js
    it('should find the rule matching the message', function() {
      var expected = config.rules[config.rules.length - 1],
          result = middleware.findMatchingRule(message);

      result.reactionName.should.equal(expected.reactionName);
      result.githubRepository.should.equal(expected.githubRepository);
      result.should.not.have.property('channelName');
    });
```

Note that `expected` is assigned the last element from `config.rules`, which
contains:

```json
    {
      "reactionName": "evergreen_tree",
      "githubRepository": "hub",
      "channelNames": ["hub"]
    },

    {
      "reactionName": "smiley",
      "githubRepository": "hubot-slack-github-issues"
    },

    {
      "reactionName": "evergreen_tree",
      "githubRepository": "handbook"
    }
```

Since `message` contains `reaction: "evergreen_tree"`, but the
`getChannelName` stub will return a name that doesn't match the first rule,
`findMatchingRule` should return the final rule. Run `npm test -- -grep '
findMatchingRule '` and you should see:

```sh
$ npm test -- --grep ' findMatchingRule '

> 18f-unit-testing-node@0.0.0 test
> .../unit-testing-node
> gulp test "--grep" " findMatchingRule "

[13:51:23] Using gulpfile .../unit-testing-node/gulpfile.js
[13:51:23] Starting 'test'...


  Middleware
    findMatchingRule
      ✓ should find the rule matching the message


  1 passing (14ms)

[13:51:23] Finished 'test' after 138 ms
```

We have demonstrated that `findMatchingRule` _is_ calling `match` on every
`Rule` by testing for a match on the final rule. Consequently, while we
_could_ test that every value is returned, doing so is of dubious benefit.
What we should care about more is covering all of the cases where a message
matches _none_ of the rules:

```js
    it('should ignore a message if it is undefined', function() {
      // When execute() tries to pass context.response.message.rawMessage from
      // a message that doesn't have one, the argument to findMatchingRule()
      // will be undefined.
    });

    it('should ignore a message if its type does not match', function() {
    });

    it('should ignore a message if its item type does not match', function() {
    });

    it('should ignore messages that do not match any rule', function() {
    });
```

Copy and paste these tests into your file, and fill in the tests yourself.
Use the implementation of `findMatchingRule` to understand what parts of
`message` you must change to exercise every condition. All of the assertions
should be of the form `expect(...).to.be.undefined` since `findMatchingRule`
should return either a valid `Rule` object or `undefined` if no rule matches.

Make sure all of the tests exercise every case and that they all pass before
moving on to the next section.

## Starting to build the `execute` test fixture

Now that `findMatchingRule` is in place, let's return to `execute` and begin
to test it. As a base case, we want to make sure that `execute` calls
`next(done)` and returns if no rule matches:

```js
Middleware.prototype.execute = function(context, next, done) {
  var response = context.response,
      message = response.message.rawMessage,
      rule = this.findMatchingRule(message);

  if (!rule) {
    return next(done);
  }
  return 'not yet implemented';
};
```

The first thing we need to do is simulate the `context` object, the `next`
callback, and the `done` callback (called `hubotDone` in our fixture):

```js
  describe('execute', function() {
    var context, next, hubotDone;

    beforeEach(function() {
      context = {
        response: {
          message: helpers.fullReactionAddedMessage(),
          reply: sinon.spy()
        }
      };
      next = sinon.spy();
      hubotDone = sinon.spy();
    });
```

The `context.response.reply` and `next` objects defined above are [sinon
spies](http://sinonjs.org/docs/#spies). Spies are similar to stubs, but are
more limited in that they cannot be programmed to return values or throw
errors. Since both of these methods are called without any action taken on
their return values, spies are sufficient to validate the `Middleware`
behavior under test.

## Creating a full-featured incoming test message

Note that we're defining a new test helper method, `fullReactionAddedMessage`.
While the existing `reactionAddedMessage` contains the JSON returned from the
[`reaction_added` API message](https://api.slack.com/events/reaction_added),
[hubot-slack](https://www.npmjs.com/package/hubot-slack) package will wrap
this raw message with other objects. Consequently, let's add the following to
the `exercise/test/helpers/index.js` file:

```js
var Hubot = require('hubot');
var SlackBot = require('hubot-slack');

exports = module.exports = {
  // ...

  fullReactionAddedMessage: function() {
    var user, text, message;

    user = new Hubot.User(exports.USER_ID,
      { id: exports.USER_ID, name: 'jquser', room: 'handbook' });
    text = exports.REACTION;
    message = exports.reactionAddedMessage();
    return new SlackBot.SlackTextMessage(user, text, text, message);
  },

  // ...
};
```

The `reactionAddedMessage` defined above will become the `rawMessage` property
of the object returned by `fullReactionAddedMessage`. We don't necessarily
need to use actual `Hubot` and `SlackBot` objects to test our `Middleware`
behavior. However, using them provides the security that if an upgrade to
either package changes the interfaces we depend on, our tests will notify us.

## Testing the "no matching rule" case

Now add a new test case for `execute`, below the empty `should successfully
parse a message and file an issue` case:

```js
    it('should ignore messages that do not match', function() {
      delete context.response.message.rawMessage;
      expect(middleware.execute(context, next, hubotDone)).to.be.undefined;
      next.calledWith(hubotDone).should.be.true;
    });
```

Deleting `context.response.message.rawMessage` works because we know that
`execute` passes this value to `findMatchingRule`, and `findMatchingRule` will
return `undefined` if its `message` argument is `undefined`. Run the test via
`npm test -- --grep ' execute '` and ensure it passes.

We will add at least one more assertion to this rule as we implement the rest
of `execute`.

## Sketching out the rest of `execute` via `Promise` chaining

If `execute` finds a matching rule, it needs to launch a series of
asynchronous operations in a specific sequence. As introduced in the
`SlackClient` chapter,
[`Promises`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
represent asynchronous operations that will either _resolve_ to a value or be
_rejected_ with an error. A series of `Promise` objects may be chained
together to execute asynchronous operations in a way that resembles a series
of synchronous function calls. Plus, a single error handler can catch errors
arising from any link in the `Promise` chain.

Therefore, if `execute` finds a matching rule, it will return a `Promise` that
represents a `Promise` chain handling the various Slack and GitHub API calls.
Each function in this chain [returns a
`Promise`]({{ site.baseurl }}/components/slack-client/#promises-gotcha-1) that
is linked to the previous `Promise` in the chain. This chain must eventually
call `next(done)` regardless of success or error. Replace the current `return`
statement at the end of `execute` with this:

```js
  return getReactions(this, msgId, message)
    .then(fileGitHubIssue(this, msgId, rule.githubRepository))
    .then(addSuccessReaction(this, msgId, message))
    .then(handleSuccess(finish), handleFailure(finish));
```

Notice that each of these steps corresponds to the remainder of the [core
algorithm](#core-algorithm). If any of the `Promises` in the chain before
`handleSuccess` are rejected, the `handleFailure` case will report the
error. There are two pieces of data here that we've yet to define:

- **`msgId`**: a unique identifier computed for the incoming message
- **`finish`**: a callback that gets called by both `handleSuccess` and
  `handleFailure`

We'll define a function private to the module like so:

```js
function messageId(message) {
  return message.item.channel + ':' + message.item.ts;
}
```

Now we'll add a `msgId` variable to `execute`, and call it _after_
`findMatchingRule`, since this new function expects `message` to be defined:

```js
Middleware.prototype.execute = function(context, next, done) {
  var response = context.response,
      message = response.message.rawMessage,
      rule = this.findMatchingRule(message),
      msgId;

  if (!rule) {
    return next(done);
  }

  msgId = messageId(message);
```

We'll start with the most straightforward implementation of `finish` for now.
First, add a `finish` variable to the top of `execute`. Then define `finish`
thus:

```js
  finish = function() {
    next(done);
  };
```

What's left now is to implement the remaining functions in the `Promise`
chain.

## `getReactions`

The core of the `getReactions` implementation is fairly straightforward:

```js
function getReactions(middleware, msgId, message) {
  return middleware.slackClient.getReactions(message.item.channel,
    message.item.ts);
}
```

However, notice that we specified a `msgId` argument that we currently are not
using. Remember that this program will run as a Hubot plugin, and that Hubot
runs as a long-lived service, so our plugin will run indefinitely. Also, our
plugin may handle multiple incoming messages at once, making multiple
concurrent requests to Slack and GitHub in the process.

Though it's not core to the overall correct functioning of the program, these
considerations make logging a critical component of operational monitoring and
debugging. We will use `msgId` as a prefix for log messages describing the
progress and outcome of the requests made during processing of the message.

Here is the fully fleshed out version of `getReactions`:

```js
function getReactions(middleware, msgId, message) {
  var domain = middleware.slackClient.getTeamDomain(),
      channelName = middleware.slackClient.getChannelName(message.item.channel),
      timestamp = message.item.ts,
      permalink = 'https://' + domain + '.slack.com/archives/' +
        channelName + '/p' + timestamp.replace('.', ''),
      reject;

  reject = function(err) {
    return Promise.reject(new Error('failed to get reactions for ' +
      permalink + ': ' + err.message));
  };

  middleware.logger.info(msgId, 'getting reactions for', permalink);
  return middleware.slackClient.getReactions(message.item.channel, timestamp)
    .catch(reject);
}
```

We use the `slackClient` to get our team's Slack domain name, the channel
name, and the list of all reactions to the message. We define a special
`reject` handler here to add some more information to the error message
returned when `githubClient.getReactions` fails. The only `slackClient` method
used here that  we haven't yet implemented is `getTeamDomain`. This method is
very straightforward; let's implement it now in `exercise/lib/slack-client.js`:

```js
SlackClient.prototype.getTeamDomain = function() {
  return this.client.team.domain;
};
```

With all this information in hand, we compute the `permalink` pertaining to
the message. Though the `slackClient.getReactions` response will include this
`permalink`, it's very handy to include it in the log message announcing API
call.

## `fileGitHubIssue`

Recall that `slackClient.getReactions` will return a `Promise` that will
resolve to a [`reactions.get` API
response](https://api.slack.com/methods/reactions.get). The way that `Promise`
chains work is that the function passed as the first argument to
[`.then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then))
will be called with the resolved value. In that light, `fileGitHubIssue` is a
_factory function_ that returns a new function called a
[closure](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures),
which can access the arguments to `fileGitHubIssue`. This closure will also
take a `message` argument passed in from `slackClient.getReactions`:

```js
function fileGitHubIssue(middleware, msgId, githubRepository) {
  return function(message) {
    var metadata,
        permalink = message.message.permalink,
        finish;

    metadata = middleware.parseMetadata(message);
    middleware.logger.info(msgId, 'making GitHub request for', permalink);

    reject = function(err) {
      return Promise.reject(new Error('failed to create a GitHub issue in ' +
        middleware.githubClient.user + '/' + githubRepository + ': ' +
        err.message));
    };
    return middleware.githubClient.fileNewIssue(metadata, githubRepository)
      .catch(reject);
  };
}
```

Notice the final line in particular, where we _return the `Promise` created by
`githubClient.fileNewIssue`_. In fact, the `Promise` isn't created when
`fileGitHubIssue` is called; it is created when _the closure returned by
`fileGitHubIssue` is called, which then calls `githubClient.fileNewIssue`_.

This would be a good time to review [Promise gotcha #1: not returning the
`Promise`]{{ site.baseurl }}/components/slack-client/#promises-gotcha-1)
from the `SlackClient` chapter. If we return a `Promise` directly from
`fileGitHubIssue`, it will get created too early. If we don't explicitly
_return_ the `Promise`, it will execute, but it won't become integrated
into the `Promise` chain built by `execute`.

We define a special `reject` handler here to add some more information to the
error message returned when `githubClient.fileNewIssue` fails.

Also notice that there is another `Middleware` method that we have yet to
define, `parseMetadata`.

## Extracting `githubClient.fileNewIssue` information with `parseMetadata`

Recall from `GitHubClient` that the API call will create a JSON object
comprising the API method arguments. The `makeApiCall` function expects a
`metadata` object with `title` and `url` properties:

```js
function makeApiCall(client, metadata, repository) {
  var requestFactory = (client.protocol === 'https:') ? https : http,
      paramsStr = JSON.stringify({
        title: metadata.title,
        body: metadata.url
      });
```

We're now at the point in `Middleware` processing where we can compute this
information and make the GitHub call. Define the `parseMetadata` method thus:

```js
Middleware.prototype.parseMetadata = function(message) {
  var result = {
    channel: this.slackClient.getChannelName(message.channel),
    timestamp: message.message.ts,
    url: message.message.permalink
  };
  result.date = new Date(result.timestamp * 1000);
  result.title = 'Update from #' + result.channel +
    ' at ' + result.date.toUTCString();
  return result;
};
```

The `message` argument is [the result of the `slackClient.getReactions`
call](https://api.slack.com/methods/reactions.get), passed through by
`fileGitHubIssue`. The resulting issue title will contain the channel and the
date the message was entered. The issue body will be just the permalink URL
for the message. We limit the information in this way to avoid leaking any
user details, or any sensitive content contained in the message. This
information is more than enough for a repository maintainer to find the tagged
message and triage the issue.

## Testing `parseMetadata`

Since this is a lightweight, stateless method, let's break from the `Promise`
chain to write a small test to ensure `parseMetadata` behaves as expected.
Since it makes use of `slackClient`, we'll need to set up a test stub as we
did with `findMatchingRule`:

```js
  describe('parseMetadata', function() {
    var getChannelName;

    beforeEach(function() {
      getChannelName = sinon.stub(slackClient, 'getChannelName');
      getChannelName.returns('handbook');
    });

    afterEach(function() {
      getChannelName.restore();
    });
```

Before writing the test, remember that we already have two handy bits of data
in `test/helpers/index.js` from when we wrote tests for `SlackClient` and
`GitHubClient`. We'll reuse `helpers.messageWithReactions` and
`helpers.metadata` for our new test for `parseMetadata`. First, let's add a
`permalink` property to `messageWithReactions.message`, since that is key to
producing the expected `metadata`:

```js
  messageWithReactions: function() {
    return {
      ok: true,
      type: 'message',
      channel: exports.CHANNEL_ID,
      message: {
        type: 'message',
        ts: exports.TIMESTAMP,
        permalink: exports.PERMALINK,
        reactions: [
        ]
      }
    };
  },
```

Now we write the single test needed to validate `parseMetadata`:

```js
    it('should parse GitHub request metadata from a message', function() {
      middleware.parseMetadata(helpers.messageWithReactions())
        .should.eql(helpers.metadata());
      getChannelName.calledOnce.should.be.true;
      getChannelName.args.should.have.deep.property('[0]')
        .that.deep.equals([helpers.CHANNEL_ID]);
    });
```

Notice the use of the [`deep.property` chai
assertion](http://chaijs.com/api/bdd/#property) to inspect the
`getChannelName.args` array. This gives us more helpful error messages should
`getChannelName.args[0]` not exist.

Run `npm test -- --grep '^Middleware '` and ensure the test passes before
moving on.

## `addSuccessReaction`

As with `fileGitHubIssue`, `addSuccessReaction` is a factory function that
will return a closure over its arguments:

```js
function addSuccessReaction(middleware, msgId, message) {
  return function(issueUrl) {
    var channel = message.item.channel,
        timestamp = message.item.ts,
        reaction = middleware.slackClient.successReaction,
        resolve, reject;

    resolve = function() {
      return Promise.resolve(issueUrl);
    };

    reject = function(err) {
      return Promise.reject(new Error('created ' + issueUrl +
        ' but failed to add ' + reaction + ': ' + err.message));
    };

    middleware.logger.info(msgId, 'adding', reaction);
    return middleware.slackClient.addSuccessReaction(channel, timestamp)
      .then(resolve, reject);
  };
}
```

The closure takes as an argument the `issueUrl` produced when the `Promise` by
`githubClient.fileNewIssue` resolves successfully. If the entire operation
succeeds, `execute` will post `issueUrl` in the channel containing the message
as a response to the user who added the reaction.

Inside the closure, first we set up the success and error handlers for the
`slackClient.addSuccessReaction` call at the end. This final call will return
a `Promise` that has its own success and error handlers. These handlers will
execute before the next `Promise` in the chain created by `execute`.

The success handler, `resolve`, passes through the `issueUrl` by [producing a
new `Promise` that resolves to the
value](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve).
The failure handler, `reject`, creates a new
[`Error`](https://nodejs.org/api/errors.html) value used to [produce a new
`Promise` that is rejected with the
error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/reject).

Again, this can't be repeated enough: [always make sure to `return` the
`Promise` from every
function!]({{ site.baseurl }}/components/slack-client/#promises-gotcha-1)

## `handleSuccess` and `handleFailure`

`handleSuccess` and `handleFailure` are very thin shims that call `finish`
before re-returning a resolved or rejected value:

```js
function handleSuccess(finish) {
  return function(issueUrl) {
    finish('created: ' + issueUrl);
    return Promise.resolve(issueUrl);
  };
}

function handleFailure(middleware, githubRepository, finish) {
  return function(err) {
    finish(err);
    return Promise.reject(err);
  };
}
```

Recall from our definition of `execute` that `finish` is a tiny function that
calls `next(done)` to signal to Hubot that this middleware's processing is
finished. At the moment, the value we're passing in will be ignored. We'll
update `finish` to rectify this shortly.

Note that the `Promises` returned here have no bearing on the `next(done)`
call at all, or on Hubot generally. When deployed, the resolved or rejected
values will be discarded. In our tests, however, they enables us to use
[chai-as-promised assertions](https://www.npmjs.com/package/chai-as-promised)
to validate the outcome of `execute` in each test case.

## Preparing the `execute` fixture for thorough tests

We're just about ready to get some tests around this new behavior. First let's
update our `execute` test fixture:

```js
  describe('execute', function() {
    var context, next, hubotDone, message;

    beforeEach(function() {
      context = {
        response: {
          message: helpers.fullReactionAddedMessage(),
          reply: sinon.spy()
        }
      };
      next = sinon.spy();
      hubotDone = sinon.spy();
      message = helpers.fullReactionAddedMessage();

      slackClient = sinon.stub(slackClient);
      githubClient = sinon.stub(githubClient);
      logger = sinon.stub(logger);

      slackClient.getChannelName.returns('handbook');
      slackClient.getTeamDomain.returns('18f');

      slackClient.getReactions
        .returns(Promise.resolve(helpers.messageWithReactions()));
      githubClient.fileNewIssue.returns(Promise.resolve(helpers.ISSUE_URL));
      slackClient.addSuccessReaction
        .returns(Promise.resolve(helpers.ISSUE_URL));
    });
```

_Note:_ `slackClient.getTeamDomain` returns a _lowercased_ "18f" to match
`helpers.PERMALINK`.

The most notable update here is that we are stubbing the `slackClient`,
`githubClient`, and `logger` objects. Though the sinon documentation generally
recommends against this, we control all of these interfaces, as they are
defined within our own application. The risk of these objects evolving in
unexpected ways is managably tiny.

As for why we use stubs rather than full blown mock objects, read the [Mocks
vs. stubs chapter of the Concepts
guide]({{ site.baseurl }}/concepts/mocks-vs-stubs/).

Bear in mind that the `slackClient.getReactions`, `githubClient.fileNewIssue`,
and `slackClient.addSuccessReaction` responses we set in `beforeEach`
correspond to the "happy path" which produces a new GitHub issue. In each
individual test case that veers from this happy path, we will override one of
these default values.

While these tests will appear a bit more complex than previous tests, there
are two things to keep in mind. One, our `Middleware` class integrates all of
the behaviors we've developed in isolation prior to this point. Naturally
there will be more objects working in collaboration, and more behavior to
model and verify.

Second, by designing the `Middleware` class for [dependency
injection]({{ site.baseurl }}/concepts/dependency-injection), we are able to
exercise the core `execute` logic using lightweight, controllable [test
doubles](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html).
This makes our set up and tear down less cumbersome, makes corner cases easier
to exercise, and makes expected outcomes easier to validate. Plus, as systems
grow larger, isolating system components via dependency injection and test
doubles can make the test suite run exponentially faster.

## Testing the happy path

We're at the point where we can test the "happy path" through `execute`,
successfully filing an issue and adding the success reaction to the message.
Let's examine our empty test case:

```js
    it('should receive a message and file an issue', function(done) {
      done();
    });
```

Recall that `execute` will return a `Promise`, and that we've used
[chai-as-promised](https://www.npmjs.com/package/chai-as-promised) assertions
such as `should.become` and `should.be.rejectedWith` in our `SlackClient` and
`GitHubClient` tests. In those tests, we actually returned the expressions
containing those assertions, which evaluated to `Promises`, because
[mocha supports this style of asynchronous
notification](https://mochajs.org/#working-with-promises). Consequently, there
was no need to rely upon [mocha's `done` callback
support](https://mochajs.org/#asynchronous-code).

In this test, however, we're actually defining `done` because we need to
validate other behaviors after the `Promise` has resolved. [chai-as-promised
allows us to create a `Promise` chain to eventualy call
`done`](https://www.npmjs.com/package/chai-as-promised#working-with-non-promisefriendly-test-runners) using the format:

```js
    it('should do something asynchronous', function(done) {
      result.should.become(...).then(function() {
        // Other assertions...
      }).should.notify(done);
    });
```

So for our happy-path test, let's write:

```js
    it('should receive a message and file an issue', function(done) {
      middleware.execute(context, next, hubotDone)
        .should.become(helpers.ISSUE_URL).then(function() {
        next.calledWith(hubotDone).should.be.true;
      }).should.notify(done);
    });
```

Note that when we validated `next.calledWith(hubotDone).should.be.true` in
`should ignore messages that do not match`, we were able to do so directly.
This because in that case, `execute` returned `undefined` instead of a
`Promise`. In this case, since there was asynchronous work to be done,
`execute` returns a `Promise`, so we need to perform this check after the
`Promise` resolves.

Finally, let's verify that our new test passes:

```sh
$ npm test -- --grep ' execute '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" " execute "

[10:04:03] Using gulpfile .../unit-testing-node/gulpfile.js
[10:04:03] Starting 'test'...


  Middleware
    execute
      ✓ should receive a message and file an issue
      ✓ should ignore messages that do not match


  2 passing (28ms)

[10:04:04] Finished 'test' after 547 ms
```

Success! However, there are actually a couple details that our test _isn't_
testing for right now:

- `Middleware` should call `context.response.reply` to reply to the user who
  added the reaction with the GitHub URL (or an error message).
- `Middleware` should call `logger.info` or `logger.error` to record progress,
  success, or failure.

## Validating the response to the user

Let's handle the `context.response.reply` piece first by adding this assertion:

```js
      middleware.execute(context, next, hubotDone)
        .should.become(helpers.ISSUE_URL).then(function() {
        context.response.reply.args.should.eql([
          ['created: ' + helpers.ISSUE_URL]
        ]);
        next.calledWith(hubotDone).should.be.true;
      }).should.notify(done);
```

Our test should fail with:

```sh
$ npm test -- --grep ' execute '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" " execute "

[11:09:39] Using gulpfile .../unit-testing-node/gulpfile.js
[11:09:39] Starting 'test'...


  Middleware
    execute
      1) should receive a message and file an issue
      ✓ should ignore messages that do not match


  1 passing (32ms)
  1 failing

  1) Middleware execute should receive a message and file an issue:

      AssertionError: expected [] to deeply equal [ Array(1) ]
      + expected - actual

      -[]
      +[
      +  [
      +    "created: https://github.com/18F/handbook/issues/1"
      +  ]
      +]

    at exercise/test/middleware-test.js:128:44




[11:09:40] 'test' errored after
[11:09:40] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

Recall that our current `finish` function is defined in the body of `execute`
as:

```js
  finish = function() {
    next(done);
  };
```

Yet we're already passing it an argument from both `handleSuccess` and
`handleFailure`. Let's first update `finish` inline to report the success or
error message to the user:

```js
  finish = function(message) {
    response.reply(message);
    next(done);
  };
```

Run the tests again, and this should pass. While it's passing, let's take the
opportunity to create a factory function for `finish` like we did with all the
others.

```js
function handleFinish(response, next, done) {
  return function(message) {
    response.reply(message);
    next(done);
  };
}
```

Then replace the existing `finish` assignment with:

```js
  finish = handleFinish(response, next, done);
```

## Refactoring

Run the test to make sure it still passes. This an example of
[refactoring](https://en.wikipedia.org/wiki/Code_refactoring), improving the
structure of existing code to improve readability and to accommodate new
features. Having a solid suite of high-quality automated tests is critical to
making refactoring a regular habit. This in turn allows development to
continue at a sustained high pace, rather than slowing down due to fear of
breaking existing behavior. A good suite of tests will tell you when something
is wrong, and will encourage designs that are easier to change in the long
term.

## Validating logging behavior

Even though all the other test assertions serve to validate the application's
behavior, it's important to ensure that our logging behavior is in good shape.
In production, we will rely upon the logs to tell when the application is
behaving normally or experiencing an error. We should ensure that we'll get
the information we expect from our log messages.

Let's start by adding another assertion to our test:

```js
      middleware.execute(context, next, hubotDone)
        .should.become(helpers.ISSUE_URL).then(function() {
        context.response.reply.args.should.eql([
          ['created: ' + helpers.ISSUE_URL]
        ]);
        next.calledWith(hubotDone).should.be.true;
        logger.info.args.should.eql([
        ]);
      }).should.notify(done);
```

Now we're gonna cheat a little. Let's just run the test and take a look at the
output:

```sh
$ npm test -- --grep ' execute '

> 18f-unit-testing-node@0.0.0 test
> .../unit-testing-node
> gulp test "--grep" " execute "

[11:59:33] Using gulpfile .../unit-testing-node/gulpfile.js
[11:59:33] Starting 'test'...


  Middleware
    execute
      1) should receive a message and file an issue
      ✓ should ignore messages that do not match


  1 passing (36ms)
  1 failing

  1) Middleware execute should receive a message and file an issue:

      AssertionError: expected [ Array(3) ] to deeply equal []
      + expected - actual

      -[
      -  [
      -    "C5150OU812:1360782804.083113"
      -    "getting reactions for"
      -    "https://18F.slack.com/archives/handbook/p1360782804083113"
      -  ]
      -  [
      -    "C5150OU812:1360782804.083113"
      -    "making GitHub request for"
      -    "https://18f.slack.com/archives/handbook/p1360782804083113"
      -  ]
      -  [
      -    "C5150OU812:1360782804.083113"
      -    "adding"
      -    "heavy_check_mark"
      -  ]
      -]
      +[]

    at exercise/test/middleware-test.js:132:33




[11:59:33] 'test' errored after 549 ms
[11:59:33] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

We're seeing a few things we expect:

- each call has the message ID as the first argument
- the first two calls include the message permalink
- the last call includes `config.successReaction`

However, we're missing:

- a call for when the message matches a rule
- a call for when the entire operation succeeds

Since we'll expect the message ID at the beginning of every log message, let's
write a helper function to generate the expected log arguments:

```js
exports = module.exports = {
  // ...existing constants...
  // Note that this is exports.CHANNEL_ID + ':' + exports.TIMESTAMP, but since
  // it's a constant, we can't use an expression to define it.
  MESSAGE_ID: 'C5150OU812:1360782804.083113',

  // ...existing helper functions...
  // Don't forget to add a comma after the previous one!

  logArgs: function() {
    var args = new Array(arguments.length),
        i;

    for (i = 0; i !== args.length; ++i) {
      args[i] = arguments[i];
    }
    args.unshift(exports.MESSAGE_ID);
    return args;
  }
```

Now let's update our test to read:

```js
        var matchingRule = new Rule(helpers.baseConfig().rules[2]);

        // ...existing assertions...
        logger.info.args.should.eql([
          helpers.logArgs('matches rule:', matchingRule),
          helpers.logArgs('getting reactions for', helpers.PERMALINK),
          helpers.logArgs('making GitHub request for', helpers.PERMALINK),
          helpers.logArgs('adding', helpers.baseConfig().successReaction),
          helpers.logArgs('created: ' + helpers.ISSUE_URL)
        ]);
```

Run the test, and make sure it fails. Then go back to `Middleware` and add or
update the necessary calls to `logger.info` to get the test to pass. Note that
the last call will require passing `logger` and the message ID as arguments to
`handleFinish`.

Make sure the test passes before continuing to the next section.

## Prevent filing multiple issues _while_ filing an issue

So we've now tested a complete path through our core algorithm. However,
there's a couple of corner cases we've yet to cover. The first is ensuring
that when `execute` has begun to file an issue, that it doesn't allow another
`reaction_added` event for the same message.

Since we have a successful happy path test case in hand, let's copy parts of
it and adapt it for this new requirement. If processing for a particular
message is already underway, a subsequent call for the same message should
return `undefined`:

```js
    it('should not file another issue for the same message when ' +
      'one is in progress', function(done) {
      var result;

      result = middleware.execute(context, next, hubotDone);
      if (middleware.execute(context, next, hubotDone) !== undefined) {
        return done(new Error('middleware.execute did not prevent filing a ' +
          'second issue when one was already in progress'));
      }

      result.should.become(helpers.ISSUE_URL).then(function() {
        logger.info.args.should.contain(helpers.logArgs('already in progress'));
      }).should.notify(done);
    });
```

There's no need to check all of the same assertions as before; we've already
got a thorough test for the success case. Repeating the same assertions time
and again in different tests that exercise the same code paths is clutter that
reduces the utility of the suite.

However, we do want to validate an "already in progress" log message. Let's
run the test and make sure it fails:

```sh
$ npm test -- --grep ' execute '

> 18f-unit-testing-node@0.0.0 test
> .../unit-testing-node
> gulp test "--grep" " execute "

[13:23:20] Using gulpfile .../unit-testing-node/gulpfile.js
[13:23:20] Starting 'test'...


  Middleware
    execute
      ✓ should receive a message and file an issue
      ✓ should ignore messages that do not match
      1) should not file another issue for the same message when one is in
progress


  2 passing (47ms)
  1 failing

  1) Middleware execute should not file another issue for the same message
when one is in progress:
     Error: middleware.execute did not prevent a second issue being filed when
one was in progress
    at Context.<anonymous> (exercise/test/middleware-test.js:160:21)




[13:23:20] 'test' errored after
[13:23:20] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

So in order to get this test to pass, we need to keep a note of the messages
that we're in the middle of processing. We're already computing message ID
values, so that's a start.

It turns out that we can add a new object in the `Middleware` constructor:

```js
function Middleware(config, slackClient, githubClient, logger) {
  // ...existing assignments...
  this.inProgress = {};
}
```

and add the message ID as a property inside `execute`:

```js
  msgId = messageId(message);
  if (this.inProgress[msgId]) {
    log(msgId + ': already in progress');
    return next(done);
  }
  this.inProgress[msgId] = true;
```

Note that this isn't thread-safe; in other languages we would need to protect
this object with a [mutex](https://en.wikipedia.org/wiki/Mutual_exclusion).
However, since [Node.js uses a single-threaded event loop
model](https://nodejs.org/en/about/), no mutexes are necessary here.

Run the test again, and you should see this:

```sh
$ npm test -- --grep ' execute '

> 18f-unit-testing-node@0.0.0 test
> .../unit-testing-node
> gulp test "--grep" " execute "

[13:51:25] Using gulpfile .../unit-testing-node/gulpfile.js
[13:51:25] Starting 'test'...


  Middleware
    execute
      ✓ should receive a message and file an issue
      ✓ should ignore messages that do not match
      1) should not file another issue for the same message when one is in
progress


  2 passing (48ms)
  1 failing

  1) Middleware execute should not file another issue for the same message
when one is in progress:
     AssertionError: expected [ Array(6) ] to include [
'C5150OU812:1360782804.083113', 'already in progress' ]
    at exercise/test/middleware-test.js:166:33




[13:51:25] 'test' errored after
[13:51:25] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

This doesn't make much sense. We can add `console.log` statements to our tests
and _see_ that the "already in progress" value is a member of
`logger.info.args`. What gives?

It turns out that the standard [`contains`
assertion](http://chaijs.com/api/bdd/#include) has difficulty comparing
elements of an array that are themselves arrays. We need the [`chai-things`
assertion library](http://chaijs.com/plugins/chai-things). First add the
`require` statement and `chai.use` call at the top of the file:

```js
var chaiThings = require('chai-things');

var expect = chai.expect;
chai.should();
chai.use(chaiAsPromised);
chai.use(chaiThings);
```

Then update the assertion to read:

```js
        logger.info.args.should.include.something.that.deep.equals(
          helpers.logArgs('already in progress'));
```

Now run the test and ensure it passes.

## Cleaning up message-in-progress IDs

We have to be careful to remove the in-progress message IDs after we've
finished processing a message or errored out. Especially if the first attempt
errored out, since we may be able to successfully process the message in the
future.

To cover this case, we'll make one last change to this test case. We'll make
one more `middleware.execute` call _inside the callback_, and move the
`should.notify(done)` clause to the end of this new expression:

```js
      result.should.become(helpers.ISSUE_URL).then(function() {
        logger.info.args.should.include.something.that.deep.equals(
          helpers.logArgs('already in progress'));

        // Make another call to ensure that the ID is cleaned up. Normally the
        // message will have a successReaction after the first successful
        // request, but we'll test that in another case.
        middleware.execute(context, next, hubotDone)
          .should.become(helpers.ISSUE_URL).should.notify(done);
      });
```

Note that we still need not make any additional assertions after the final
call; we've already got a thorough test for the base success case. Repeating
the same assertions time and again in different tests that exercise the same
code paths is busywork.

Running this test right away should result in a failure due to a timeout:

```sh
$ npm test -- --grep ' execute '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" " execute "

[10:20:43] Using gulpfile .../unit-testing-node/gulpfile.js
[10:20:43] Starting 'test'...


  Middleware
    execute
      ✓ should receive a message and file an issue
      ✓ should ignore messages that do not match
      1) should not file another issue for the same message when one is in
progress


  2 passing (2s)
  1 failing

  1) Middleware execute should not file another issue for the same message
when one is in progress:
     Error: timeout of 2000ms exceeded. Ensure the done() callback is being
called in this test.




[10:20:45] 'test' errored after 2.57 s
[10:20:45] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

Fixing this will require removing the message ID from `middleware.inProgress`
once processing is complete. The right place for this is in the function
returned by `handleFinish`. Let's update `handleFinish` to pass in the
`Middleware` object instead of just `logger`, then delete the message ID:

```js
function handleFinish(messageId, middleware, response, next, done) {
  return function(message) {
    middleware.logger.info(messageId, message);
    response.reply(message);
    delete middleware.inProgress[messageId];
    next(done);
  };
}
```

Again, no need for any mutexes when we delete the message ID, since the
processing model is single-threaded. In other languages, you would need to
wrap this statement in a mutex-protected block.

Now update the `handleFinish` call in `execute` to pass in the `Middleware`
object:

```js
  finish = handleFinish(msgId, this, response, next, done);
```

Run the test again, and confirm that it passes.

## Prevent filing multiple issues _after_ filing the first issue

The next case we'll cover is to prevent filing another issue for the same
message after an issue for the message already exists. We accomplish this by
adding the `config.successReaction` emoji to the message after we've
successfully filed an issue. The code needs to abort processing once it
detects the presence of this reaction.

Let's start building our our test case first:

```js
    it('should not file another issue for the same message when ' +
      'one is already filed ', function(done) {
      var message = helpers.messageWithReactions();

      message.message.reactions.push({
        name: config.successReaction,
        count: 1,
        users: [ helpers.USER_ID ]
      });
      slackClient.getReactions.returns(Promise.resolve(message));

      middleware.execute(context, next, hubotDone)
        .should.be.rejectedWith('already processed').then(function() {
        slackClient.getReactions.calledOnce.should.be.true;
        githubClient.fileNewIssue.called.should.be.false;
        slackClient.addSuccessReaction.called.should.be.false;
        context.response.reply.called.should.be.false;
        logger.info.args.should.include.something.that.deep.equals(
          helpers.logArgs('already processed ' + helpers.PERMALINK));
      }).should.notify(done);
    });
```

While or `slackClient.getReaction` call returns the message with the
`config.successReaction`, we still set the `githubClient.fileNewIssue` and
`slackClient.addSuccessReaction` stubs to respond as if
`config.successReaction` wasn't present. We want the code under test to follow
through with a successful result before we add the feature to short-circuit
the process. After we do so, we have assertions within the callback to ensure
that `githubClient.fileNewIssue` and `slackClient.addSuccessReaction` were not
called.

Also, we want to log the fact that the message already has a GitHub issue as
an _info_ message, not an _error_. We don't want to spam every user who adds
another instance of the emoji, hence we check that we don't call
`context.response.reply`.

Run the test, and it should fail by producing a "successful" result, when we
expected a short-circuit to resolve to `undefined`:

```sh
$ npm test -- --grep ' execute '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" " execute "

[11:39:03] Using gulpfile .../unit-testing-node/gulpfile.js
[11:39:03] Starting 'test'...


  Middleware
    execute
      ✓ should receive a message and file an issue
      ✓ should ignore messages that do not match
      ✓ should not file another issue for the same message when one is in
progress
      1) should not file another issue for the same message when one is
already filed


  3 passing (65ms)
  1 failing

  1) Middleware execute should not file another issue for the same message
when one is already filed :
     AssertionError: expected promise to be rejected with an error including
'already processed' but it was fulfilled with
'https://github.com/18F/handbook/issues/1'





[11:39:04] 'test' errored after 582 ms
[11:39:04] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

Now let's update the code to get the test to pass. First, let's write a
utility function to detect when the success reaction is present in a message:

```js
function alreadyProcessed(message, successReaction) {
  return message.message.reactions.find(function(reaction) {
    return reaction.name === successReaction;
  });
}
```

Now inject this into `fileGitHubIssue`, again being mindful of
[Promise gotcha #1: not returning the
`Promise`]{{ site.baseurl }}/components/slack-client/#promises-gotcha-1):

```js
function fileGitHubIssue(middleware, msgId, githubRepository) {
  return function(message) {
    var metadata, permalink = message.message.permalink;

    if (alreadyProcessed(message, middleware.successReaction)) {
      return Promise.reject('already processed ' + permalink);
    }
```

Note that we're only passing a string to `Promise.reject`, not an `Error`.
This is because we want to short-circuit the operation, but not because of an
abnormal condition. This will be of consequence when we add tests for the
error cases shortly.

Finally, let's update the function returned from `handleFinish` to avoid
posting any `already filed` messages:

```js
function handleFinish(messageId, middleware, response, next, done) {
  return function(message) {
    middleware.logger.info(messageId, message);
    if (!(message.startsWith && message.startsWith('already '))) {
      response.reply(message);
    }
```

At this point, run the test again, and ensure it passes before moving on to
the next section.

## Testing error cases

Now it's time to give the "unhappy paths" their due. In the first case, we
want to validate the behavior when an incoming message matches a rule, but
getting its reactions fails. This is going to look very similar to the case we
just wrote in the previous section:

```js
    it('should receive a message but fail to get reactions', function(done) {
      var errorMessage = 'failed to get reactions for ' + helpers.PERMALINK +
        ': test failure';

      slackClient.getReactions
        .returns(Promise.reject(new Error('test failure')));

      middleware.execute(context, next, hubotDone)
        .should.be.rejectedWith(errorMessage).then(function() {
        slackClient.getReactions.calledOnce.should.be.true;
        githubClient.fileNewIssue.called.should.be.false;
        slackClient.addSuccessReaction.called.should.be.false;

        context.response.reply.args.should.have.deep.property(
          '[0][0].message', errorMessage);
        logger.error.args.should.have.deep.property(
          '[0][0]', helpers.MESSAGE_ID);
        logger.error.args.should.have.deep.property(
          '[0][1].message', errorMessage);
      }).should.notify(done);
    });
```

Note that we're now checking `logger.error.args`, not `logger.info.args`.
Also, since we're validating a result that contains an `Error` object, we have
to be more deliberate with the `context.response.reply` assertion. This is
because no two `Error` objects are equal to one another, so we can't create a
`new Error` as an assertion argument. We have to check the `message` field of
each Error explicitly. For both stubs, `args[0]` is the argument list for the
first call to the stub.

Now let's run the test to see what shakes out:

```sh
$ npm test -- --grep ' execute '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" " execute "

[17:16:31] Using gulpfile .../unit-testing-node/gulpfile.js
[17:16:31] Starting 'test'...


  Middleware
    execute
      ✓ should receive a message and file an issue
      ✓ should ignore messages that do not match
      ✓ should not file another issue for the same message when one is in
progress
      ✓ should not file another issue for the same message when one is already
filed
      1) should receive a message but fail to get reactions


  4 passing (74ms)
  1 failing

  1) Middleware execute should receive a message but fail to get reactions:
     AssertionError: expected [] to have a deep property '[0][0]'
    at exercise/test/middleware-test.js:213:44




[17:16:32] 'test' errored after
[17:16:32] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

If you look closely, _it's the next to last assertion that's failing_.
Everything else is already working as expected: `githubClient.fileNewIssue` is
returning a rejected `Promise`, and consequently, `middleware.execute`
resolves to that rejected value, and doesn't call
`slackClient.addSuccessReaction`. The only issue here is that `logger.error`
is empty.

All we have to do to get the test to pass is update the function returned by
`handleFinish` to differentiate between `Error` messages and other types:

```js
function handleFinish(messageId, middleware, response, next, done) {
  return function(message) {
    if (message instanceof Error) {
      middleware.logger.error(messageId, message.message);
    } else {
      middleware.logger.info(messageId, message);
    }

    if (!(message.startsWith && message.startsWith('already '))) {
      response.reply(message);
    }
    delete middleware.inProgress[messageId];
    next(done);
  };
}
```

Notice that in the `message instanceof Error` case, we explicitly log the
`message.message` field. This is because logging the actual `Error` object
will include the class name in the output, which we don't need or want.

Run the tests, and verify that the new test passes. Then, add this next
test, which validates the behavior when the request to file a GitHub issue
fails. It is nearly identical to the previous one except that
`githubClient.fileNewIssue` produces the failure (notice
`calledOnce.should.be.true`):

```js
    it('should get reactions but fail to file an issue', function(done) {
      var errorMessage = 'failed to create a GitHub issue in 18F/handbook: ' +
        'test failure';

      githubClient.fileNewIssue
        .returns(Promise.reject(new Error('test failure')));

      middleware.execute(context, next, hubotDone)
        .should.be.rejectedWith(errorMessage).then(function() {
        slackClient.getReactions.calledOnce.should.be.true;
        githubClient.fileNewIssue.calledOnce.should.be.true;
        slackClient.addSuccessReaction.called.should.be.false;

        context.response.reply.args.should.have.deep.property(
          '[0][0].message', errorMessage);
        logger.error.args.should.have.deep.property(
          '[0][0]', helpers.MESSAGE_ID);
        logger.error.args.should.have.deep.property(
          '[0][1]', errorMessage);
      }).should.notify(done);
    });
```

Even though the last few assertions look identical to those in the previous
test, they are actually validating different code paths and values for
`errorMessage`. Hence, contrary to earlier advice against repeating
assertions, in this case it makes sense since they only appear to be the same,
but actually aren't.

However, it's still prudent to extract these assertions into a helper
function, so that we can easily see their common purpose across test cases.
Let's call this helper function `checkErrorResponse`:

```js
  describe('execute', function() {
    var context, next, hubotDone, message, checkErrorResponse;

    // ...

    checkErrorResponse = function(errorMessage) {
      context.response.reply.args.should.have.deep.property(
        '[0][0].message', errorMessage);
      logger.error.args.should.have.deep.property('[0][0]', helpers.MESSAGE_ID);
      logger.error.args.should.have.deep.property('[0][1]', errorMessage);
    };
```

Replace the assertions from this test case and the previous one with the new
function like so:

```js
        checkErrorResponse(errorMessage);
```

Run the test, and verify that the new test passes. Then, add this test, which
validates the behavior when the GitHub issue request succeeds but adding the
success reaction to the message fails. It is nearly identical to the previous
one except that `slackClient.addSuccessReaction` produces the failure (notice
`calledOnce.should.be.true`):

```js
    it('should file an issue but fail to add a reaction', function(done) {
      var errorMessage = 'created ' + helpers.ISSUE_URL +
        ' but failed to add ' + helpers.baseConfig().successReaction +
        ': test failure';

      slackClient.addSuccessReaction
        .returns(Promise.reject(new Error('test failure')));

      middleware.execute(context, next, hubotDone)
        .should.be.rejectedWith(errorMessage).then(function() {
        slackClient.getReactions.calledOnce.should.be.true;
        githubClient.fileNewIssue.calledOnce.should.be.true;
        slackClient.addSuccessReaction.calledOnce.should.be.true;
        checkErrorResponse(errorMessage);
      }).should.notify(done);
    });
```

## <a name="interface-boundary"></a>Preventing `Errors` from escaping the application interface boundary

We've done a good job ensuring our `execute` function handles `Errors` by
calling `reject` handlers in each `Promise`. Should any code that `Middleware`
depends upon throw an `Error`, the `handleFailure` error handler function will
convert it into a rejected `Promise`. `handleFailure` will then log any
`Errors` before calling `next(done)`.

However, at the moment, we can never be completely positive that an `Error`
will never escape our `execute` function. Changes in the application or its
dependencies may eventually cause `Errors` outside of the `Promise` chain and
its failure handler. If that happens, we'll pollute the log with a nasty stack
trace, and `next(done)` won't get called.

Allowing an error from our application to cross an interface boundary is a bad
habit. Since `Middleware.execute` will serve as the touchpoint between Hubot
and our application, we would do well to prevent it from allowing any errors
to escape.

There is a straightforward fix to this, however. Push the entire `execute`
implementation into another function, `doExecute`, and wrap it in a
[`try...catch`
block](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch):

```js
Middleware.prototype.execute = function(context, next, done) {
  try {
    return doExecute(this, context, next, done);

  } catch (err) {
  }
};

function doExecute(middleware, context, next, done) {
  // Update existing implementation to replace `this` with `middleware`.
}
```

Make this change, and run the tests to ensure they all still pass. Then add
the following test case, which sets the expectation that `execute` will log
unhandled errors and send them as a reply to the user.

```js
    it('should catch and log unanticipated errors', function() {
      var errorMessage = 'unhandled error: Error\nmessage: ' +
            JSON.stringify(helpers.reactionAddedMessage(), null, 2);

      slackClient.getChannelName.throws();
      expect(middleware.execute(context, next, hubotDone)).to.be.undefined;
      next.calledWith(hubotDone).should.be.true;
      context.response.reply.args.should.eql([[errorMessage]]);
      logger.error.args.should.eql([[null, errorMessage]]);
    });
```

The error message will include a copy of the incoming message that triggered
the error. This is arguably a lot more helpful than a stack trace, at least
for people trying to report the error. The developer can then try to reproduce
the error by writing a test using the same input.

Run the test and make sure it fails. Then update the `execute` function to
appear thus:

```js
Middleware.prototype.execute = function(context, next, done) {
  var errorMessage;

  try {
    return doExecute(this, context, next, done);

  } catch (err) {
    errorMessage = 'unhandled error: ' +
      (err instanceof Error ? err.message : err) + '\nmessage: ' +
        JSON.stringify(context.response.message.rawMessage, null, 2);
    this.logger.error(null, errorMessage);
    context.response.reply(errorMessage);
    return next(done);
  }
};
```

## Check your work

By this point, all of the `Middleware` tests should be passing:

```sh
$ npm test -- --grep '^Middleware '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Middleware "

[19:16:06] Using gulpfile .../unit-testing-node/gulpfile.js
[19:16:06] Starting 'test'...


  Middleware
    findMatchingRule
      ✓ should find the rule matching the message
      ✓ should ignore a message if it is undefined
      ✓ should ignore a message if its type does not match
      ✓ should ignore a message if its item type does not match
      ✓ should ignore messages that do not match any rule
    parseMetadata
      ✓ should parse GitHub request metadata from a message
    execute
      ✓ should receive a message and file an issue
      ✓ should ignore messages that do not match
      ✓ should not file another issue for the same message when one is in progress
      ✓ should not file another issue for the same message when one is already filed
      ✓ should receive a message but fail to get reactions
      ✓ should get reactions but fail to file an issue
      ✓ should file an issue but fail to add a reaction
      ✓ should catch and log unanticipated errors


  14 passing (110ms)

[19:16:07] Finished 'test' after 683 ms
```

Now that you're finished, compare your solutions to the code in
[`solutions/05-middleware/lib/middleware.js`]({{ site.baseurl }}/solutions/05-middleware/lib/middleware.js)
and
[`solutions/05-middleware/test/middleware-test.js`]({{ site.baseurl }}/solutions/05-middleware/test/middleware-test.js).

At this point, `git commit` your work to your local repo. After you do, copy
the `middleware.js` file from `solutions/05-middleware/lib` into
`exercises/lib` to see if it passes the test you wrote. Then run `git reset
--hard HEAD` and copy the test files instead to see if your implementation
passes. If a test case fails, review the section of this chapter pertaining to
the failing test case, then try to update your code to make the test pass.
