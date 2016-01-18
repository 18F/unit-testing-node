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

If you've skipped to this chapter, you can establish the starting state of the
`exercise/` files for this chapter by running:

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
- using the [`sinon` library](http://sinonjs.org/) to create
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
/* jshint node: true */

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
fixture. We'll also instantiate `Config`, `SlackClient`, and `GitHubClient`
objects. Add all of the necessary `require` statements, and then create
`config`, `slackClient`, and `githubClient`:

```js
var Middleware = require('../lib/middleware');
var Config = require('../lib/config');
var GitHubClient = require('../lib/github-client');
var SlackClient = require('../lib/slack-client');
var helpers = require('./helpers');
var chai = require('chai');

var expect = chai.expect;
chai.should();

describe('Middleware', function() {
  var config, slackClient, githubClient, middleware;

  beforeEach(function() {
    config = new Config(helpers.baseConfig());
    slackClient = new SlackClient(undefined, config);
    githubClient = new GitHubClient(config);
    middleware = new Middleware(config, slackClient, githubClient);
  });
```

Note that we're not defining the `logger` argument yet. We'll cover this in a
later section.

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
> /Users/michaelbland/src/18F/unit-testing-node
> gulp test "--grep" " findMatchingRule "

[13:51:23] Using gulpfile ~/src/18F/unit-testing-node/gulpfile.js
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
    .then(handleSuccess(finish))
    .catch(handleFailure(this, rule.githubRepository, finish));
```

Notice that each of these steps corresponds to the remainder of the [core
algorithm](#core-algorithm). If any of the `Promises` in the chain before
`handleSuccess` are rejected, the `catch(handleFailure)` case will report the
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
  return middleware.slackClient.getReactions(message.item.channel, timestamp);
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
        channelName + '/p' + timestamp.replace('.', '');

  middleware.logger(msgId, 'getting reactions for ' + permalink);
  return middleware.slackClient.getReactions(message.item.channel, timestamp);
}
```

We use the `slackClient` to get our team's Slack domain name, the channel
name, and the list of all reactions to the message. The only one we haven't
yet implemented is `getTeamDomain`. This method is very straightforward; let's
implement it now in `exercise/lib/slack-client.js`:

```js
SlackClient.prototype.getTeamDomain = function() {
  return this.client.team.domain;
};
```

With all this information in hand, we get the `permalink` pertaining to the
message. Though the `slackClient.getReactions` response will include this
`permalink`, it's very handy to include it in the log message announcing API
call.

## Logging and log testing

In the deployed program the `logger` argument to the `Middleware` constructor
will be an instance of the `Logger` class. This object, in turn, will be a
thin wrapper over the `logger` member of the Hubot instance. Logger will have
`info` and `error` methods that add the script name and message ID as prefixes
to each log message.

## `fileGitHubIssue`

## `addSuccessReaction`

## `handleSuccess`

## `handleFailure`

## Preventing multiple issues from being filed while filing an issue

## Preventing multiple issues from being filed after filing an issue

## Testing

## Check your work

By this point, all of the `Middleware` tests should be passing:

```sh
```

Now that you're all finished, compare your solutions to the code in
[`solutions/04-middleware/lib/github-client.js`]({{ site.baseurl }}/solutions/04-middleware/lib/github-client.js)
and
[`solutions/04-middleware/test/github-client-test.js`]({{ site.baseurl }}/solutions/04-middleware/test/github-client-test.js).

You may wish to `git commit` your work to your local repo at this point. After
doing so, try copying the `config.js` file from `solutions/04-middleware`
into `exercises` to see if it passes the test you wrote. Then run `git reset
--hard HEAD` and copy the test files instead to see if your implementation
passes.
