---
title: Middleware class
---
The `Middleware` class is the figurative heart and brain of the
application—it's where all of the pieces you've built up so far [come
together](https://www.youtube.com/watch?v=uSM5MpKSnqE). The name `Middleware`
refers to the class's role in implementing a piece of [Hubot receive
middleware](https://hubot.github.com/docs/scripting/#middleware). You can find
it in the [`exercise/lib/middleware.js`]({{ site.baseurl }}/exercise/lib/middleware.js) file.

If you've skipped ahead to this chapter, you can establish the starting state
of the `exercise/` files for this chapter by running:

```sh
$ ./go set-middleware
```

## What to expect

Thanks to the work you've done encapsulating configuration validation in the
`Config` class, rule-matching logic in the `Rule` class, and API calls to
Slack and GitHub in the `SlackClient` and `GitHubClient` classes, the
`Middleware` class can focus solely on the core application logic.

Because you've already thoroughly tested them in isolation, you don't need to
test all possible corner and error cases for the aforementioned classes. In
fact, you don't need to run any HTTP servers in the `Middleware` test because
you can simulate their behavior using [test
doubles](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html).
This will make the `Middleware` tests easier to write, maintain, and understand.

In short, this chapter will teach you how to:

- Build your core application object using [composition rather than
  inheritance]({{ site.baseurl }}/concepts/object-composition-vs-inheritance)
- Write more controllable, maintainable, readable tests using test doubles and
  a technique known as [dependency
  injection]({{ site.baseurl }}/concepts/dependency-injection)
- Use the [`sinon` library](http://sinonjs.org/) to create
  [test doubles](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html)
- Use `Promises` with mocha and chai

## <a name="core-algorithm"></a>The core algorithm

`Middleware` implements the core algorithm of the application—a process that
includes the following steps:

- It compares an incoming `reaction_added` message to the existing rules.
- If a match is found, it gets a list of all of the reactions to the message.
- If there is no "success" reaction (defined in the configuration), it will
  file a GitHub issue.
- It will add a "success" reaction to the message.
- Finally, it will post the link to the GitHub issue in the channel containing
  the message.

Thanks to the other classes you've written, `Middleware` is not concerned with
the details handled by those classes. This makes the `Middleware` class itself
easier to implement, understand, and test.

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
the `config.rules`, `config.successReaction`, `slackClient`, `githubClient`,
and `logger` objects become properties of the `Middleware` object. Rather than
directly implementing configuration validation, rule matching, HTTP request
behavior, and logging, the `Middleware` class delegates handling of those
detailed operations to each respective object.

Neither does `Middleware` inherit behaviors from other objects. Every
dependency on behavior *not* implemented directly by `Middleware` itself is
made explicit by a method call on a collaborating object. This is an
illustration of [object composition]({{ site.baseurl }}/concepts/object-composition-vs-inheritance),
one of the core design principles that leads to more readable, maintable,
testable code.

The second thing to notice is that the `Middleware` object doesn't create
these collaborating objects itself. Rather, these _dependencies_ are
_injected_ into the object by the code creating the `Middleware` object—hence
the name "[dependency injection]({{ site.baseurl }}/concepts/dependency-injection)".
The finished application will configure the `Middleware` to use real `Config`,
`SlackClient`, and `GitHubClient` objects. However, your tests can use
alternative implementations of `SlackClient` and `GitHubClient`, in
particular, to exercise `Middleware` behavior without making actual Slack and
GitHub API calls.

## Creating `Rule` objects from `config.rules`

First promote the flat JSON objects from `config.rules` to full-fledged `Rule`
objects. The `Config` object has already ensured that `config.rules` contains
valid `Rule` specifications, so all you have to do is map each specification
to a behavior-rich object:

```js
var Rule = require('./rule');

// ...

function Middleware(config, slackClient, githubClient, logger) {
  this.rules = config.rules.map(function(rule) {
    return new Rule(rule);
  });
```

In contrast to the injected dependencies, the `Rule` objects are small,
straightforward, and not reliant on outside resources such as files, servers,
or timers. Should this somehow ever change, you may wish to extract the `Rule`
instantiation into a factory object. For the time being, though, it's
completely OK for `Middleware` to instantiate these objects directly (unlike
`slackClient`, `githubClient`, or `logger`, which do depend on outside
resources).

## Understanding the `execute(context, next, done)` function signature

In the context of web application frameworks, "middleware" refers to a class or package implementing an
interface that allows injection of new behavior into the framework used to
implement a larger program.  The framework implements behaviors common to an
entire class of applications, so that developers can focus on supplying
application-specific behavior at well-defined points. _Middleware_ is
analogous to terms such as _plugin_, _hook_, or _extension_, but usually
refers to request processing performed before or after the core application
logic.

For our application, [Hubot](https://hubot.github.com/) is the framework, and
the `Middleware` object implements the [receive middleware
specification](https://hubot.github.com/docs/scripting/#middleware), which
defines an `execute()` function accepting the following arguments:

- **`context`**: for [receive
  middleware](https://hubot.github.com/docs/scripting/#receive-middleware-api),
  this contains a `response` property that contains the incoming `message`, as
  well as a `reply` method that sends a response message to the user
- **`next`**: a callback function that runs the next piece of receive
  middleware; it must be called with **`done`** as an argument, or a function
  that eventually calls **`done`**
- **`done`**: a callback function taking no arguments that signals completion
  of receive middleware processing; typically passed as the sole argument to
  **`next`**, but a receive middleware function can call it to abort further
  processing

Technically speaking, the `Middleware` class abuses the middleware concept, as
it _is_ the core application from our perspective. However, it is more complex
than a typical script, and implementing it as middleware seemed easier than
extending the `robot` interface presented to Hubot scripts.

At this point, you will need to uncomment the arguments and pick apart into
separate variables the various parts of `context` that you need:

```js
Middleware.prototype.execute = function(context, next, done) {
  var response = context.response,
      message = response.message.rawMessage;
}
```

## The `reaction_added` message format

The `message` variable holds the raw JSON object representing the
[`reaction_added` message](https://api.slack.com/events/reaction_added). These
messages look like this:

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

Note that, per the API documentation, the `item` member can also be a `file`
or a `file_comment`. Your implementation will not handle those types, though
the actual application may eventually add support for them.

The conversation message receiving the `reaction_added` message is uniquely
identified by the channel ID (`channel`) and timestamp (`ts`). This is why you
added those parameters to the `SlackClient` methods that implement the
[`reactions.get`](https://api.slack.com/methods/reactions.get) and
[`reactions.add`](https://api.slack.com/methods/reactions.add) Slack API
calls.

## Finding the matching `Rule` for an incoming `reaction_added` message

You need to iterate through the array of `Rule` objects to find the `Rule`
that matches the incoming message. Import the `SlackClient` library and give
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

Then, assign `this.slackClient` to a new variable, since [`this` will refer to
a different object inside the
callback](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#Lexical_this).

Looking closely, you can see that there's also a new member to add to
`SlackClient`. Inside
[`exercise/lib/slack-client.js`]({{ site.baseurl }}/exercise/lib/slack-client.js),
add the following just below the constructor:

```js
// From: https://api.slack.com/events/reaction_added
// May get this directly from a future version of the slack-client package.
SlackClient.REACTION_ADDED = 'reaction_added';
```
This keeps with the theme of adding all Slack-related information and behavior
encapsulated within the `SlackClient` class. Of course, the most technically
correct thing to do would be to `require('slack-client')` and get the value
that way. However, because the `reaction_added` message label is the
only piece of information you need, you can
[minimize dependencies]({{ site.baseurl }}/concepts/minimizing-dependencies/)
by assigning this one constant value yourself.

Finally, wrap `this.rules.find` in a conditional to ensure that you call
`Rule.match` with a valid message. This could theoretically be part of the
`Rule.match` behavior itself. However, since the result of this check would
remain the same across all `Rule` objects for any message, it makes sense to
implement it here.

## Testing `findMatchingRule`

Another benefit of writing this method first is that doing so will allow you
to test its behavior thoroughly and directly without calling `execute`.
Because `execute` will be the single function responsible for the entire
application, it makes sense to implement and test this step in isolation.
[This will give you confidence that all the corner cases are accounted for,
without an exponential explosion in the number of test
cases](http://googletesting.blogspot.com/2008/02/in-movie-amadeus-austrian-emperor.html).

Look first at the first empty test case in
[`exercise/test/middleware-test.js`]({{ site.baseurl }}/exercise/test/middleware-test.js):

```js
describe('Middleware', function() {
  describe('findMatchingRule', function() {
    it('should find the rule matching the message', function() {
    });
  });
```

At this step, you need to instantiate a `Middleware` instance in the test
fixture. You'll also instantiate `Config`, `SlackClient`, `GitHubClient`, and
`Logger` objects. Add all of the necessary `require` statements, configure the
chai assertions, and then create the `config`, `slackClient`, `githubClient`,
`logger`, and `middleware` fixture variables:

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

Notice that you're instantiating `logger` using the `console` object. It
contains `info` and `error` methods just like the `robot.logger` that the real
application will use. As you'll see later, it shouldn't invoke any of the
`console` methods. If it happens by accident, you'll see the unexpected output
printed within the test results.

## Introducing the `sinon` test double library

You may have noticed that you didn't define the `robotSlackClient` argument to
the `SlackClient` constructor. Since `SlackClient` has already been thoroughly
tested, you can emulate its behavior without defining all (or any) of its
dependencies by using a [test
double](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html).
You'll now introduce the [Sinon library](http://sinonjs.org/) to create a
test double for `SlackClient`.

Sinon is a library that you can use to create stub, fake, and mock objects.
Though you wrote your own
[`SlackClientImplStub`]({{ site.baseurl }}/exercises/test/helpers/slack-client-impl-stub.js)
when testing the `Rule` class, you'll need more objects and more behavior for
testing `Middleware`. Because of this, you'll use `sinon` to create a double
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

Here, create a [stub](http://sinonjs.org/docs/#stubs) for the `getChannelName`
method of the `slackClient` object. Using the `returns` method, you can
control what the stub returns when it's called. There are many other features
of Sinon stubs; you're welcome to explore the [Sinon
documentation](http://sinonjs.org/docs/) and experiment with other methods
beyond what's covered in this chapter.

## `reaction_added` test data

The final thing you need is a `reaction_added` message instance. Now that
you're familiar with the pattern of adding test data to the `test/helpers`
package, add the following to `exercise/test/helpers/index.js`:

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

With this helper data in place, you can now implement the first test:

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
findMatchingRule '` and you should see the following:

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

You have demonstrated that `findMatchingRule` _is_ calling `match` on every
`Rule` by testing for a match on the last member of `config.rules`.
Consequently, while you _could_ test to make sure that every value is
returned, doing so is of dubious benefit. Instead, you should focus on
covering all of the cases where a message matches _none_ of the rules:

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

Copy and paste these tests into your file and fill in the tests yourself.
Use the implementation of `findMatchingRule` to understand what parts of the
`message` you must change to exercise every condition. All of the assertions
should be of the form `expect(...).to.be.undefined` since `findMatchingRule`
should return either a valid `Rule` object or `undefined` if no rule matches.

Make sure all of the tests exercise every case and that they all pass before
moving on to the next section.

## Starting to build the `execute` test fixture

Now that `findMatchingRule` is in place, let's return to `execute` and begin
to test it. As a base case, make sure that `execute` calls `next(done)` and
returns if no rule matches:

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

The first thing you need to do is simulate the `context` object, the `next`
callback, and the `done` callback (called `hubotDone` in the fixture):

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
errors. Because both of these methods are called without any action taken on
their return values, spies are sufficient to validate the `Middleware`
behavior under test.

## Creating a full-featured incoming test message

It's worth pointing out that you're in the process of defining a new test
helper method, `fullReactionAddedMessage`. While the existing
`reactionAddedMessage` contains the JSON returned from the [`reaction_added`
API message](https://api.slack.com/events/reaction_added),
[hubot-slack](https://www.npmjs.com/package/hubot-slack) package will wrap
this raw message with other objects. Consequently, add the following to the
`exercise/test/helpers/index.js` file:

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
of the object returned by `fullReactionAddedMessage`. You don't necessarily
need to use actual `Hubot` and `SlackBot` objects to test our `Middleware`
behavior. However, using them will provide you the security that if an upgrade
to either package changes the interfaces we depend on, you tests will notify
you.

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

Deleting `context.response.message.rawMessage` works because `execute` passes
this value to `findMatchingRule`, and `findMatchingRule` will return
`undefined` if its `message` argument is `undefined`. Run the test via `npm
test -- --grep ' execute '` and make sure that it passes.

Next you'll add more assertions to this rule as you implement the rest of
`execute`.

## Sketching out the rest of `execute` via `Promise` chaining

If `execute` finds a matching rule, it needs to launch a series of
asynchronous operations in a specific sequence. As you learned in the
`SlackClient` chapter,
[`Promises`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
represent asynchronous operations that will either _resolve_ to a value or be
_rejected_ with an error. You can chain a series of `Promise` objects together
to execute asynchronous operations in a way that resembles a series of
synchronous function calls. In addition, a single error handler can catch
errors arising from any link in the `Promise` chain.

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

Note that each of these steps corresponds to the remainder of the [core
algorithm](#core-algorithm). If any `Promise` in the chain before
`handleSuccess` is rejected, the `handleFailure` case will report the error.
There are two pieces of data here that you have yet to define:

- **`msgId`**: a unique identifier computed for the incoming message
- **`finish`**: a callback that gets called by both `handleSuccess` and
  `handleFailure`

Define a function private to the module like so:

```js
function messageId(message) {
  return message.item.channel + ':' + message.item.ts;
}
```

Now add a `msgId` variable to `execute`, and call it _after_
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

However, note that you specified a `msgId` argument that you're currently not
using. Remember that this program will run as a Hubot plugin, and that Hubot
runs as a long-lived service, so the plugin will run indefinitely. Also, the
plugin may handle multiple incoming messages at once, making multiple
concurrent requests to Slack and GitHub in the process.

Though it's not core to the overall correct functioning of the program, these
considerations make logging a critical component of operational monitoring and
debugging. You'll use `msgId` as a prefix for log messages describing the
progress and outcome of the requests made during processing of the message.

Here is the fully fleshed-out version of `getReactions`:

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

You use the `slackClient` to get your team's Slack domain name, the channel
name, and the list of all reactions to the message. You must define a special
`reject` handler here to add some more information to the error message
returned when `githubClient.getReactions` fails. The only `slackClient` method
used here that you haven't yet implemented is `getTeamDomain`. This method is
very straightforward; implement it now in `exercise/lib/slack-client.js`:

```js
SlackClient.prototype.getTeamDomain = function() {
  return this.client.team.domain;
};
```

With all this information in hand, you can compute the `permalink` pertaining
to the message. Though the `slackClient.getReactions` response will include
this `permalink`, it's very handy to include it in the log message announcing
API call.

## `fileGitHubIssue`

Recall that `slackClient.getReactions` will return a `Promise` that will
resolve to a [`reactions.get` API
response](https://api.slack.com/methods/reactions.get). `Promise` chains work
by using the resolved value to call the function passed as the first argument
to [`.then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then)).
In that light, `fileGitHubIssue` is a _factory function_ that returns a new
function called a [closure](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures),
which can access the arguments to `fileGitHubIssue`. This closure will also
take a `message` argument passed in from `slackClient.getReactions`:

```js
function fileGitHubIssue(middleware, msgId, githubRepository) {
  return function(message) {
    var metadata,
        permalink = message.message.permalink,
        reject,
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

Notice the final line, which _returns the `Promise` created by
`githubClient.fileNewIssue`_. In fact, the `Promise` isn't created when
`fileGitHubIssue` is called; it is created when _the closure returned by
`fileGitHubIssue` is called, which then calls `githubClient.fileNewIssue`_.

This is a good time for you to review [Promise gotcha #1: not returning the
`Promise`]{{ site.baseurl }}/components/slack-client/#promises-gotcha-1) from
the `SlackClient` chapter. If you return a `Promise` directly from
`fileGitHubIssue`, it will get created too early. If you don't explicitly
_return_ the `Promise`, it will execute, but it won't become integrated into
the `Promise` chain built by `execute`.

The `reject` handler adds some more information to the error message returned
when `githubClient.fileNewIssue` fails. Also, please note that there is
another `Middleware` method—`parseMetadata`—that you have yet to define.

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

You're now at the point in `Middleware` processing where you can compute this
information and make the GitHub call. Define the `parseMetadata` method as
follows:

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
for the message. Limiting the information in this way avoids leaking any user
details or other sensitive content contained in the message. This information
is more than enough for a repository maintainer to find the tagged message and
triage the issue.

## Testing `parseMetadata`

Since this is a lightweight, stateless method, let's break from the `Promise`
chain to write a small test to ensure `parseMetadata` behaves as expected.
Since it makes use of `slackClient`, you'll need to set up a test stub as you
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

Before writing the test, remember that you already have two handy bits of data
in `test/helpers/index.js` from when you wrote tests for `SlackClient` and
`GitHubClient`. You'll reuse `helpers.messageWithReactions` and
`helpers.metadata` for the new test for `parseMetadata`. First, add a
`permalink` property to `messageWithReactions.message`, since it's key to
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

Now write the single test needed to validate `parseMetadata`:

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
`getChannelName.args` array. This will provide more helpful error messages
in the case that `getChannelName.args[0]` doesn't exist.

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

The closure takes as an argument the `issueUrl` that's produced when the
`Promise` by `githubClient.fileNewIssue` resolves successfully. If the entire
operation succeeds, `execute` will post `issueUrl` as a response to the user
who added the reaction (in the channel containing the message).

Inside the closure, you should first set up the success and error handlers for
the `slackClient.addSuccessReaction` call at the end. This final call will
return a `Promise` that has its own success and error handlers that will
will execute before the next `Promise` in the chain created by `execute`.

`resolve`, the success handler, passes through the `issueUrl` by [producing a
new `Promise` that resolves to the `issueUrl`
value](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve).
`reject`, the failure handler, creates a new
[`Error`](https://nodejs.org/api/errors.html) value used to [produce a new
`Promise` that is rejected with the
error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/reject).

Again, this can't be repeated enough: [Always make sure to `return` the
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

function handleFailure(finish) {
  return function(err) {
    finish(err);
    return Promise.reject(err);
  };
}
```

Recall from the previously discussed definition of `execute` that `finish` is
a tiny function that calls `next(done)` to signal to Hubot that a given
middleware's processing is finished. At the moment, the value you're passing
in will be ignored (though you'll update `finish` shortly to rectify this).

Note that the `Promises` returned here have no bearing on the `next(done)`
call at all, or on Hubot generally. When deployed, the resolved or rejected
values will be discarded. In your tests, however, they enables you to use
[chai-as-promised assertions](https://www.npmjs.com/package/chai-as-promised)
to validate the outcome of `execute` in each test case.

## Preparing the `execute` fixture for thorough tests

You're just about ready to get some tests around this new behavior. First,
update your `execute` test fixture:

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

*Note:* `slackClient.getTeamDomain` returns a _lowercased_ "18f" to match
`helpers.PERMALINK`.

The most notable update here is that you're stubbing the `slackClient`,
`githubClient`, and `logger` objects. Though the sinon documentation generally
recommends against this, you control all of these interfaces, which are
defined within your own application. Because of this, the risk of these
objects evolving in unexpected ways is manageably tiny.

As for why you should use stubs rather than full-blown mock objects, read the
[Mocks vs. stubs chapter of the Concepts guide]({{ site.baseurl }}/concepts/mocks-vs-stubs/).

Bear in mind that the `slackClient.getReactions`, `githubClient.fileNewIssue`,
and `slackClient.addSuccessReaction` responses you set in `beforeEach`
correspond to the "happy path," which produces a new GitHub issue. In each
test case that veers from this happy path, you will override one of these
default values.

These tests appear to be a bit more complex than previous tests, and there are
two related points to keep in mind. One, your `Middleware` class integrates
all of the behaviors you've developed in isolation prior to this point.
Naturally, there will be more objects working in collaboration, along with
more behavior to model and verify.

Second, by designing the `Middleware` class for [dependency
injection]({{ site.baseurl }}/concepts/dependency-injection), you're able to
exercise the core `execute` logic using lightweight, controllable [test
doubles](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html).
This makes your setup and tear down less cumbersome, makes corner cases easier
to exercise, and makes expected outcomes easier to validate. Plus, as systems
grow larger, isolating system components via dependency injection and test
doubles can make the test suite run exponentially faster.

## Testing the happy path

You're now at the point where you can test the "happy path" through `execute`,
successfully filing an issue and adding the success reaction to the message.
Let's examine the empty test case:

```js
    it('should receive a message and file an issue', function(done) {
      done();
    });
```

Recall that `execute` will return a `Promise`, and recall too that you've used
[chai-as-promised](https://www.npmjs.com/package/chai-as-promised) assertions
such as `should.become` and `should.be.rejectedWith` in your `SlackClient` and
`GitHubClient` tests. In those tests, you actually returned the expressions
containing those assertions (which evaluated to `Promises`) because [mocha
supports this style of asynchronous
notification](https://mochajs.org/#working-with-promises). Consequently, you
had no need to rely upon [mocha's `done` callback
support](https://mochajs.org/#asynchronous-code).

In this test, however, you're actually defining `done` because you need to
validate other behaviors after the `Promise` has resolved. [chai-as-promised
allows you to create a `Promise` chain to eventually call
`done`](https://www.npmjs.com/package/chai-as-promised#working-with-non-promisefriendly-test-runners)
using the format:

```js
    it('should do something asynchronous', function(done) {
      result.should.become(...).then(function() {
        // Other assertions...
      }).should.notify(done);
    });
```

For your happy-path test, write the following:

```js
    it('should receive a message and file an issue', function(done) {
      middleware.execute(context, next, hubotDone)
        .should.become(helpers.ISSUE_URL).then(function() {
        next.calledWith(hubotDone).should.be.true;
      }).should.notify(done);
    });
```

Note that when you validated `next.calledWith(hubotDone).should.be.true` in
`should ignore messages that do not match`, you were able to do so directly.
This was because, in that case, `execute` returned `undefined` instead of a
`Promise`. In this case, because there is asynchronous work to be done,
`execute` returns a `Promise`, so we need to perform this check after the
`Promise` resolves.

Finally, verify that your new test passes:

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

Success! However, there are actually a couple details that your test _isn't_
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

Your test should fail with the following:

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

Recall that your current `finish` function is defined in the body of `execute`
as:

```js
  finish = function() {
    next(done);
  };
```

Yet you're already passing it an argument from both `handleSuccess` and
`handleFailure`. Let's first update `finish` inline to report the success or
error message to the user:

```js
  finish = function(message) {
    response.reply(message);
    next(done);
  };
```

Run the tests again, and this should pass. While it's passing, take the
opportunity to create a factory function for `finish` as you did with all the
others:

```js
function handleFinish(response, next, done) {
  return function(message) {
    response.reply(message);
    next(done);
  };
}
```

Then replace the existing `finish` assignment with this:

```js
  finish = handleFinish(response, next, done);
```

## Refactoring

Run the test to make sure it still passes. This an example of
[refactoring](https://en.wikipedia.org/wiki/Code_refactoring), or improving
the structure of existing code to improve readability and accommodate new
features. Having a solid suite of high-quality automated tests is critical to
making refactoring a regular habit. This, in turn, allows development to
continue at a sustained high pace, rather than requiring it to slow down due
to the fear of breaking existing behavior. A good suite of tests will tell you
when something is wrong, and will encourage designs that are easier to change
in the long term.

## Validating logging behavior

Even though all the other test assertions serve to validate the application's
behavior, it's important to ensure that your logging behavior is in good
shape. In production, you will rely upon the logs to tell when the application
is behaving normally or experiencing an error. You should ensure that you'll
get the information you expect from your log messages.

Start by adding another assertion to your test:

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

Now you're going to cheat a little. Just run the test and take a look at the
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

You're seeing a few things you should've expected:

- Each call has the message ID as the first argument.
- The first two calls include the message permalink.
- The last call includes `config.successReaction`.

However, you're also missing a few things:

- A call for when the message matches a rule
- A call for when the entire operation succeeds

Since you'll expect the message ID at the beginning of every log message,
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

Now update your test to read:

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

Run the test and make sure it fails. Then go back to `Middleware` and add or
update the necessary calls to `logger.info` to get the test to pass. Note that
the last call will require passing `logger` and the message ID as arguments to
`handleFinish`.

Make sure the test passes before continuing to the next section.

## Prevent filing multiple issues _while_ filing an issue

You've now tested a complete path through your core algorithm. However,
you still have a few corner cases to cover. The first is ensuring that when
`execute` has begun to file an issue, it doesn't allow another
`reaction_added` event for the same message.

Because you already have a successful happy path test case in hand, you can
copy parts of it and adapt it for this new requirement. If processing for a
particular message is already underway, a subsequent call for the same message
should return `undefined`:

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

There's no need to check all of the same assertions as before; you've already
got a thorough test for the success case. Repeating the same assertions time
and again in different tests that exercise the same code paths is clutter that
reduces the utility of the suite.

However, you do want to validate an "already in progress" log message. Run the
test and make sure it fails:

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

In order to get this test to pass, you need to keep a note of the messages
that are in the middle of processing. You're already computing message ID
values—a good start.

It turns out that you can add a new object in the `Middleware` constructor:

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

Note that this isn't thread-safe; in other languages you'd need to protect
this object with a [mutex](https://en.wikipedia.org/wiki/Mutual_exclusion).
However, since [Node.js uses a single-threaded event loop
model](https://nodejs.org/en/about/), you don't need to use any mutexes here.

Run the test again. You should see the following:

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

This doesn't make much sense. You can add `console.log` statements to your
tests and _see_ that the "already in progress" value is a member of
`logger.info.args`. What gives?

It turns out that the standard [`contains`
assertion](http://chaijs.com/api/bdd/#include) has difficulty comparing
elements of an array that are themselves arrays. In this case, you need to use
the [`chai-things` assertion library](http://chaijs.com/plugins/chai-things).
First add the `require` statement and `chai.use` call at the top of the file:

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

You have to be careful to remove the in-progress message IDs after you've
finished processing a message or errored out. This is especially true if your
first attempt errored out, since you may be able to successfully process the
message in the future.

To cover this case, make one last change to this test case. Start by making
one more `middleware.execute` call _inside the callback_, and then move the
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
returned by `handleFinish`. Update `handleFinish` to pass in the `Middleware`
object instead of just `logger`, and then delete the message ID:

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

Again, there's no need for any mutexes when you delete the message ID, since
the processing model is single-threaded. In other languages, you would need to
wrap this statement in a mutex-protected block.

Now update the `handleFinish` call in `execute` to pass in the `Middleware`
object:

```js
  finish = handleFinish(msgId, this, response, next, done);
```

Run the test again and confirm that it passes.

## Prevent filing multiple issues _after_ filing the first issue

The next case you'll cover is how to prevent filing another issue for the same
message after an issue for the message already exists. You'll accomplish this
by adding the `config.successReaction` emoji to the message after you've
successfully filed an issue. The code needs to abort processing once it
detects the presence of this reaction.

Start this step by building our your test case:

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

While your `slackClient.getReaction` call returns the message with the
`config.successReaction`, you must still set the `githubClient.fileNewIssue` and
`slackClient.addSuccessReaction` stubs to respond as if
`config.successReaction` wasn't present. You want the code under test to follow
through with a successful result before you add the feature to short circuit
the process. After you do so, you'll have assertions within the callback to
ensure that `githubClient.fileNewIssue` and `slackClient.addSuccessReaction`
aren't called.

You also want to log as an _info_ message (not an _error_) the fact that the
message already has a GitHub issue. You don't want to spam every user who adds
another instance of the emoji, hence, you need to check that you don't call
`context.response.reply`.

Run the test—it should fail by producing a "successful" result when you
expected a short circuit to resolve to `undefined`:

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

Now update the code to get the test to pass. First, write a utility function
to detect when the success reaction is present in a message:

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

Note that you're only passing a string (instead of an `Error` object) to
`Promise.reject`. You're doing this because you want to short circuit the
operation for a reason other than the presence of an abnormal condition. This
will be of consequence shortly when you add tests for the error cases.

Finally, update the function returned from `handleFinish` to avoid posting any
`already filed` messages:

```js
function handleFinish(messageId, middleware, response, next, done) {
  return function(message) {
    middleware.logger.info(messageId, message);
    if (!(message.startsWith && message.startsWith('already '))) {
      response.reply(message);
    }
```

Now run the test again and ensure that it passes before moving on to the next
section.

## Testing error cases

It's time now to give the "unhappy paths" their due. In the first case, you
want to validate the behavior when an incoming message matches a rule, but
getting the messages's reactions fails. This will look very similar to the
case you just wrote in the previous section:

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

Note that you're now checking `logger.error.args`, not `logger.info.args`.
What's more, since you're validating a result that contains an `Error` object,
you have to be more deliberate with the `context.response.reply` assertion.
This is because no two `Error` objects are equal to one another, so you can't
create a `new Error` as an assertion argument. Rather, you have to check the
`message` field of each Error explicitly. For both stubs, `args[0]` is the
argument list for the first call to the stub.

Run the test to see what shakes out:

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

If you look closely, _it's the next to last assertion that's failing_:
`logger.error` is turning up empty when we check for `helpers.MESSAGE_ID` as
element `[0][0]`.  Everything else is already working as expected:
`githubClient.fileNewIssue` is returning a rejected `Promise`, and
consequently, `middleware.execute` resolves to that rejected value and
doesn't call `slackClient.addSuccessReaction`. The only issue here is that
`logger.error` is empty.

All you need to do to get the test to pass is update the function returned by
`handleFinish` to differentiate between `Error` messages and other types of
messages:

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

In the `message instanceof Error` case, you explicitly log the
`message.message` field. This is because logging the actual `Error` object
will include the class name in the output, which you don't need or want.

Run the tests and verify that the new test passes. Then, add this next
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
test, they're actually validating different code paths and values for
`errorMessage`. Hence, contrary to earlier advice against repeating
assertions, in this case the repetition makes sense since the assertions only
appear to be the same, but actually aren't.

That said, it's still prudent to extract these assertions into a helper
function, so you can easily see their common purpose across test cases.  Call
this helper function `checkErrorResponse`:

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

Run the new test and verify that the it passes. Then, add this test, which
validates the behavior when the GitHub issue request succeeds but adding the
success reaction to the message fails. It is nearly identical to the previous
test, except that `slackClient.addSuccessReaction` produces the failure
(notice `calledOnce.should.be.true`):

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

You've done a good job ensuring that your `execute` function handles `Errors`
by calling `reject` handlers in each `Promise`. Should any code that
`Middleware` depends upon throw an `Error`, the `handleFailure` error handler
function will convert it into a rejected `Promise`. `handleFailure` will then
log any `Errors` before calling `next(done)`.

However, at the moment, you can't be completely positive that an `Error`
will never escape our `execute` function. Changes in the application or its
dependencies may eventually cause `Errors` outside of the `Promise` chain and
its failure handler. If that happens, you'll pollute the log with a nasty
stack trace, and `next(done)` won't get called.

Allowing an error from your application to cross an interface boundary is a
bad habit. Since `Middleware.execute` will serve as the touchpoint between
Hubot and your application, you'd do well to prevent it from allowing any
errors to escape.

Fortunately, there's a straightforward fix to this situation. Push the entire
`execute` implementation into another function called `doExecute` and wrap it
in a [`try...catch`
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

Make this change and run the tests to ensure that they all still pass. Then
add the following test case, which sets the expectation that `execute` will
log unhandled errors and send them as a reply to the user:

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
the error. This is arguably a lot more helpful than a stack trace—at least,
that is, for people trying to report the error. The developer can then try to
reproduce the error by writing a test using the same input.

Run the test and make sure it fails. Then update the `execute` function to
appear as follows:

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
