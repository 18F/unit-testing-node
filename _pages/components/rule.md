---
title: Rule class
---
The `Rule` class compares a incoming messages against a single rule defined in
the configuration file. It is very small, but it encapsulates important logic,
part of which depends on the [slack-client npm
package](https://www.npmjs.com/package/slack-client). You can find this class
in the [`exercise/lib/rule.js`]({{ site.baseurl }}/exercise/lib/rule.js) file.

If you don't have experience writing or using test doubles, testing the `Rule`
class is a great way to gain some experience. If you're looking for more of a
challenge, then move on to the next chapter. And if you've skipped ahead to
this chapter, you can establish the starting state of the `exercise/` files
for this chapter by running:

```sh
$ ./go set-rule
```

## What to expect

Each `Rule` object implements the behavior implied by each member of
`Config.rules`. This is one of the smaller classes in the system, but it's an
interesting one because:

- Its `match()` method provides a generic interface to arbitrarily complex
  boolean logic
- This logic can be broken down into multiple smaller methods
- It uses an object from another package to implement part of its decision
  logic

We'll simulate this external decision logic using a [test
double](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html).

## Building a `Rule` object

The beginning of the `rule.js` file, where the `Rule` constructor is defined,
looks like this:

```js
'use strict';

module.exports = Rule;

function Rule(configRule) {
  for (var property in configRule) {
    if (configRule.hasOwnProperty(property)) {
      this[property] = configRule[property];
    }
  }
}
```

When the `Rule` object is constructed, it assigns every property from
`configRule` to itself. The
[`hasOwnProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty)
check ensures that the only properties copied into the `Rule` are those defined
by the configuration rule itself, excluding those inherited from
[`Object`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object#Object_instances_and_Object_prototype_object).
(As the `Config` chapter illustrated, you can also use
[`Object.keys`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys) for this purpose.)

`configRule` should come from the `rules` property of a `Config` object
(`config.rules`). As the previous chapter mentions, the `Config` object
validates the entire configuration, so there is no need for this object to
validate the rule. (Arguably, we _could have_ designed the `Rule` object to
perform its own validation, and perhaps in a future release it will.)

## Testing the `Rule` constructor

To validate our `Rule` constructor we must verify that it contains all the
properties from the configuration object. While this seems trivial, it's one
small concrete step towards testing the rest of the behavior. It's also
critical to ensure that [the constructor produces no
surprises]({{ site.baseurl}}/concepts/valid-by-contract/), as it could result
in unexpected behavior from other methods.

Open up the
[`exercise/test/rule-test.js`]({{ site.baseurl }}/exercise/test/rule-test.js)
file in your favorite editor. You should see this:

```js
'use strict';

describe('Rule', function() {
  it('should contain all the fields from the configuration', function() {
  });
});
```

The first thing you want to do is to make sure that the `Rule` constructor
builds a valid object without errors. You'll also need to import the Chai
assertion framework. Update the top of the file to reflect the following
`require` statements:

```js
var Rule = require('../lib/rule');
var chai = require('chai');
var expect = chai.expect;
```

Then add an implementation to the `'should contain all the fields from the
configuration'` test. Pass a data object into the `Rule` constructor and
verify that the new `Rule` object contains the same data as the original JSON
object. The most expedient comparison is to use
[`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
on both objects and to compare the result. It's a blunt instrument, but for
this small case, it gets the job done. In this test, you'll use the `expect`
form of [Chai BDD-style assertions](http://chaijs.com/api/bdd/).

The test should look something like this:

```js
  it('should contain all the fields from the configuration', function() {
    var configRule = {
          // Add valid configuration rule data here, using
          // exercises/test/helpers/test-config.json as a model.
        },
        rule = new Rule(configRule);
    expect(JSON.stringify(rule)).to.eql(JSON.stringify(configRule));
  });
```

Verify that the test passes by running `npm test`. To limit the output to just
the `Rule` tests, run it as `npm test -- --grep '^Rule '`:

```sh
$ npm test -- --grep '^Rule '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Rule "

[17:24:28] Using gulpfile .../unit-testing-node/gulpfile.js
[17:24:28] Starting 'test'...


  Rule
    ✓ should contain all the fields from the configuration


  1 passing (4ms)

[17:24:29] Finished 'test' after 59 ms
```

Good tests fail when they should. At this point, verify that the test fails by
altering the `configRule` object after the `Rule` is created:

```js
    delete configRule.reactionName;
```

Running the test again should produce these results:

```sh
$ npm test -- --grep '^Rule '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Rule "

[17:26:57] Using gulpfile .../unit-testing-node/gulpfile.js
[17:26:57] Starting 'test'...


  Rule
    1) should contain all the fields from the configuration


  0 passing (10ms)
  1 failing

  1) Rule should contain all the fields from the configuration:

      AssertionError: expected '{"reactionName":"evergreen_tree","githubRepository":"hub","channelNames":["hub"]}' to deeply equal '{"githubRepository":"hub","channelNames":["hub"]}'
      + expected - actual

      -{"reactionName":"evergreen_tree","githubRepository":"hub","channelNames":["hub"]}
      +{"githubRepository":"hub","channelNames":["hub"]}

    at Context.<anonymous> (exercise/test/rule-test.js:20:37)




[17:26:57] 'test' errored after 65 ms
[17:26:57] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

Now that you're confident the test will fail when it should, remove the
alteration so that the test passes again.

## Designing the `Rule.match()` method

The `match()` method needs to inspect a `reaction_added` message and return
`true` if the rule applies. The format of a `reaction_added` message is as
follows:

```json
{
  "type": "reaction_added",
  "user": "U024BE7LH",
  "item": {
    "type": "message",
    "channel": "C2147483705",
    "ts": "1360782804.083113"
  },
  "reaction": "evergreen_tree",
  "event_ts": "1360782804.083113"
}
```

Therefore, the rule should match if:

- The message's `reaction` value matches `Rule.reactionName`
- `Rule.channelNames` is undefined, _or_ the message's `item.channel` value
  is a member of `Rule.channelNames`

Even though you could write this as a single function, these concerns are
different enough that they're best extracted into separate functions:

```js
Rule.prototype.match = function(message, slackClient) {
  return (this.reactionMatches(message) &&
    this.channelMatches(message, slackClient));
};
```

Extracting into separate functions not only makes the `match()` method easier
to understand, but it also makes it easy to add new conditions to `match()`
one day, should the need arise.

## Testing `Rule.reactionMatches()`

Testing `reactionMatches()` is an easy part of this process—your test only
needs to check that the message's `reaction` matches `Rule.reactionName`.
However, before you write the test, hoist the `configRule` from the previous
test into a helper method in the fixture:

```js
describe('Rule', function() {
  var makeConfigRule = function() {
    return {
      reactionName: 'evergreen_tree',
      githubRepository: 'hub',
      channelNames: ['hub']
    };
  };

  it('should contain all the fields from the configuration', function() {
    var configRule = makeConfigRule(),
        rule = new Rule(configRule);
    expect(JSON.stringify(rule)).to.eql(JSON.stringify(configRule));
  });
});
```

Remember, you've wrapped the data in a method so that each test gets a
different copy, which keeps the tests isolated from one another. Make sure the
test still passes, and then add a new test called `'should match a message from
one of the channelNames'`, using the sample message from above:

```js
  it('should match a message from one of the channelNames', function() {
    var rule = new Rule(makeConfigRule()),
        message = {
          type: 'reaction_added',
          user: 'U024BE7LH',
          item: {
            type: 'message',
            channel: 'C2147483705',
            ts: '1360782804.083113'
          },
          reaction: 'evergreen_tree',
          'event_ts': '1360782804.083113'
        };
    expect(rule.match(message)).to.be.true;
  });
```

The `reaction: 'evergreen_tree'` component is the key that identifies this
message as an `evergreen_tree` emoji reaction. This is the piece that will
match the `reactionName` property of the rule generated by `makeConfigRule`.

Notice that you're still calling `rule.match()` instead of
`rule.reactionMatches()`. This is a judgment call, given the relatively
straightforward `Rule.match()` algorithm. However, should it grow more
complex, you can later test each individual component of the algorithm in
isolation. [This will give you confidence that all the corner cases are
accounted for, without an exponential explosion in the number of test
cases](http://googletesting.blogspot.com/2008/02/in-movie-amadeus-austrian-emperor.html).

Run the tests. Since you've yet to implement either `reactionMatches()` or
`channelMatches()`, this test should fail. Now add an implementation for
`reactionMatches()` that compares the message's `reaction` against the
`Rule`'s `reactionName`.

Once again, run the test. The test should still fail. This is because
`channelMatches()` doesn't yet return anything, causing `rule.match()` to
return `undefined`. For now, just update `channelMatches()` to return `true`
unconditionally. (No, this isn't correct behavior—you'll account for this
very shortly.) Once the test passes, you're all set to move on.

Now add a new test called `'should ignore a message if its name does not
match'`. Before you fill it in, hoist the sample message out of the previous
test and into the fixture. Make sure the tests continue to pass after doing
so:

```js
describe('Rule', function() {
  // makeConfigRule() definition

  var makeMessage = function() {
    return {
      type: 'reaction_added',
      user: 'U024BE7LH',
      item: {
        type: 'message',
        channel: 'C2147483705',
        ts: '1360782804.083113'
      },
      reaction: 'evergreen_tree',
      'event_ts': '1360782804.083113'
    };
  };

  // other tests...

  it('should match a message from one of the channelNames', function() {
    var rule = new Rule(makeConfigRule()),
        message = makeMessage();
    expect(rule.match(message)).to.be.true;
  });
```

This test should begin slightly differently than the earlier test in order
to exercise the condition that the message names don't match. In this case,
you're updating the `configRule`. Alternatively, you can change
`message.reaction` instead.

```js
  it('should should ignore a message if its name does not match', function() {
    var configRule = makeConfigRule(),
        message = makeMessage(),
        rule;

    configRule.reactionName = 'sad-face';
    rule = new Rule(configRule);

    expect(rule.match(message)).to.be.false;
  });
```

Run the test. When it passes, move on to the next section.

## Testing `Rule.channelMatches()`

First, the easy case: Add a test called `'should match a message from any
channel'`. Copy the implementation from `'should match a message from one of
the channelNames'`, and then add this line before the `expect()` clause:

```js
    delete rule.channelNames;
```

Run the test. It should pass. Now add another test called `'should ignore a
message if its channel doesn\'t match'`. Copy the implementation from the
previous test, but change two things:

- Remove the `delete rule.channelNames` line
- Change `to.be.true` condition to `to.be.false`

Run the test. It should fail. This is because you made `channelMatches()`
always return `true` to get the earlier test to pass. Your goal now is to get
the new test to pass while making sure all the previous tests continue to
pass.

## Implementing `channelMatches()`

`channelMatches()` will not be very complex, but it will certainly be more
complex than `reactionMatches()`. It needs to ensure the following:

- If the `Rule` does not have any `channelNames` defined, it should always
  return `true`.
- Otherwise, it should only return `true` if the channel from the message
  matches one of the `channelNames`.

Go ahead and implement the first condition, making sure the previous test
still passes. To get the new test to pass, you'll first have to take care of a
bit of a wrinkle.

## The external Slack client dependency

The incoming `reaction_added` message has an `item.channel` property, but it's
encoded as a unique identifier assigned by the Slack system. However, the
`Config` class uses a human-readable array of `channelNames`. In order to
implement `channelMatches`, you need to translate the identifier to a
human-readable name. In production, you'll rely on the `slack-client` instance
passed in from Hubot to perform this translation.

## Using a stub for the external Slack client interface

You have a number of options to simulate this functionality in your unit test
in a fast, controllable, and reliable way using a test double:

- You can create a Slack client _stub_ to pass into `rule.match()` and hardcode
  it to return a particular value.
- You can use a test double library to generate such a stub.
- You can introduce a new abstraction for the Slack client.

In this situation, any of the three options will work reasonably well.
Thinking ahead about the needs of the application, you should note that other
parts of the application will depend on this Slack interface, as well. This
would favor the third option.

However, since this is such a small example, you can create your own stub for
the Slack client for now. Writing the stub also helps illustrate some of the
concepts behind test stubs, which is helpful before you use a more complex
library like [sinon](http://sinonjs.org/). Add this to the file before the
`describe('Rule')` declaration:

```js
function SlackClientImplStub(channelName) {
  this.channelName = channelName;
}

SlackClientImplStub.prototype.getChannelByID = function(channelId) {
  this.channelId = channelId;
  return { name: this.channelName };
};
```

This stub hardcodes the `channelName` that `getChannelByID` will return.
The actual `slack-client` object returns a `Channel` instance that contains a
`name` property, and you can simulate that using a small JavaScript object.
`SlackClientImplStub` also records the `channelId` passed to the stub. This
will allow you to validate the the argument passed by the code under test.

## Applying `SlackClientImplStub` to the test

Equipped with the stub, you can now get the test to pass. Update the test to
look like this:

```js
  it('should ignore a message if its channel doesn\'t match', function() {
    var rule = new Rule(makeConfigRule()),
        message = makeMessage(),
        slackClient = new SlackClientImplStub('not-the-hub');

    expect(rule.match(message, slackClient)).to.be.false;
    expect(slackClient.channelId).to.eql(message.item.channel);
  });
```

Run the test and make sure it fails. Now update `channelMatches()` to
implement the second condition, where the function will return `true` if the
`message.item.channel` translates to one of the names in `this.channelNames`,
using `SlackClient.getChannelByID()` to translate. (Hint: use
[`Array.prototype.indexOf()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf).)

When you're finished, run the tests again. Notice that `'should ignore a
message if its channel doesn\'t match'` passes, but `'should match a message
from one of the channelNames'` fails.

```sh
$ npm test -- --grep '^Rule '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Rule "

[17:01:41] Using gulpfile .../unit-testing-node/gulpfile.js
[17:01:41] Starting 'test'...


  Rule
    ✓ should contain all the fields from the configuration
    1) should match a message from one of the channelNames
    ✓ should ignore a message if its name does not match
    ✓ should match a message from any channel
    ✓ should ignore a message if its channel doesn't match


  4 passing (9ms)
  1 failing

  1) Rule should match a message from one of the channelNames:
     TypeError: Cannot read property 'getChannelByID' of undefined
    at Rule.channelMatches (exercise/lib/rule.js:26:33)
    at Rule.match (exercise/lib/rule.js:16:10)
    at Context.<anonymous> (exercise/test/rule-test.js:52:17)




[17:01:41] 'test' errored after 65 ms
[17:01:41] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

It's failing because the earlier test is now exercising the new code path you
just introduced into `channelMatches()`. In this case, the test itself—not the
code under test—that needs updating. Update all the tests that call
`rule.match()` with the following declaration:

```js
        // previous var declarations...
        slackClient = new SlackClientImplStub('hub');
```

Then update all of the `rule.match(message)` calls to read
`rule.match(message, slackClient)`. And for good measure, add these assertions
to all of the affected tests, as well:

```js
    // For tests that should exercise the new channelMatches() logic.
    expect(slackClient.channelId).to.eql(message.item.channel);

    // For all other tests calling rule.match().
    expect(slackClient.channelId).to.be.undefined;
```

## Check your work

By this point, all of the `Rule` tests should be passing:

```sh
$ npm test -- --grep '^Rule '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Rule "

[17:11:05] Using gulpfile .../unit-testing-node/gulpfile.js
[17:11:05] Starting 'test'...


  Rule
    ✓ should contain all the fields from the configuration
    ✓ should match a message from one of the channelNames
    ✓ should ignore a message if its name does not match
    ✓ should match a message from any channel
    ✓ should ignore a message if its channel doesn't match


  5 passing (8ms)

[17:11:05] Finished 'test' after 70 ms
```

Now that you're finished, compare your solutions to the code in
[`solutions/01-rule/lib/rule.js`]({{ site.baseurl }}/solutions/01-rule/lib/rule.js)
and
[`solutions/01-rule/test/rule-test.js`]({{ site.baseurl }}/solutions/01-rule/test/rule-test.js).

At this point, `git commit` your work to your local repo. After you do, copy
the `rule.js` file from `solutions/01-rule/lib` into `exercises/lib` to see if
it passes the test you wrote. Then run `git reset --hard HEAD` and copy the
test files instead to see if your implementation passes. If a test case fails,
review the section of this chapter pertaining to the failing test case, then
try to update your code to make the test pass.
