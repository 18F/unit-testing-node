---
permalink: /components/rule/
parent: Designing and testing the components
title: Rule class
---
The `Rule` class is very small, but encapsulates important logic, part of
which depends on the [slack-client npm
package](https://www.npmjs.com/package/slack-client). You can find it in the
[`exercise/lib/rule.js`]({{ site.baseurl }}/exercise/lib/rule.js) file.

If you don't have experience writing or using fake objects, testing the `Rule`
class is a great way to gain some experience. If you're looking for more of a
challenge, run the following commands, then move on to the next chapter:

```sh
$ cp solutions/01-rule/lib/rule.js exercise/lib/rule.js
$ cp solutions/01-rule/test/rule-test.js exercise/test/rule-test.js
```

## What to expect

Each `Rule` object implements the behavior implied by each member of
`Config.rules`. This is one of the smaller classes in the system, but an
interesting one because:

- its `match()` method provides a generic interface to arbitrarily complex
  boolean logic
- that can be broken down into multiple smaller methods, and
- it uses an object from another package to implement part of its decision
  logic.

## Building a `Rule` object

The beginning of the `rule.js` file, where the `Rule` constructor is defined,
looks like this:

```js
/* jshint node: true */
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
check ensures only properties defined by the configuration rule itself are
copied.

`configRule` should come from the `rules` property of a `Config` object, i.e.
`config.rules`. As discussed in the previous chapter, the `Config` object
validates the entire configuration, so there is no need for this object to
validate the rule. (Arguably we _could have_ designed the `Rule` object to
perform its own validation. Perhaps in a future release it will.) 

## Testing that a `Rule` contains all the properties from the configuration

Open up the
[`exercise/test/rule-test.js`]({{ site.baseurl }}/exercise/test/rule-test.js)
file in your favorite editor. You should see this:

```js
/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

describe('Rule', function() {
  it('should contain all the fields from the configuration', function() {
  });
});
```

The first thing we want to do is to make sure that the `Rule` constructor
builds a valid object without errors. We'll also need to import the Chai
assetion framework. Update the top of the file to reflect the following
`require` statements:

```js
var Rule = require('../lib/rule');
var chai = require('chai');
var expect = chai.expect;
```

Then add an implementation to the `'should contain all the fields from the
configuration'` test. Pass a data object into the `Rule` constructor, and
verify that the new `Rule` object contains the same data as the original JSON
object.

The most expedient comparison is to use
[`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
on both objects and to compare the result. It's a blunt instrument, but for
our small case, it gets the job done. In this test, we'll use the `expect`
form of [Chai BDD-style assertions](http://chaijs.com/api/bdd/).

The test should look something like:

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

Verify that the tests passes by running `npm test`. To limit the output to just the `Rule` tests, run it as `npm test -- --grep '^Rule '`:

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

Good tests fail when they should, so at this point, verify that the test
fails by altering the `configRule` object after the `Rule` is created:

```js
    delete configRule.reactionName;
```

Then running the test again should produce:

```sh
$ npm test -- --grep '^Rule '

> 18f-unit-testing-node@0.0.0 test
> /Users/michaelbland/src/18F/unit-testing-node
> gulp test "--grep" "^Rule "

[17:26:57] Using gulpfile ~/src/18F/unit-testing-node/gulpfile.js
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

Now that we're confident the test will fail when it should, remove the
alteration so that the test passes again.

## Check your work

Now that you're all finished, compare your solutions to the code in
[`solutions/01-rule/lib/rule.js`]({{ site.baseurl }}/solutions/01-rule/lib/rule.js)
and
[`solutions/01-rule/test/rule-test.js`]({{ site.baseurl }}/solutions/01-rule/test/rule-test.js).

You may wish to `git commit` your work to your local repo at this point. After
doing so, try copying the `config.js` file from `solutions/01-rule` into
`exercises` to see if it passes the test you wrote. Then run `git reset --hard
HEAD` and copy the test files instead to see if your implementation passes.
