---
title: Config class
---
The first object we'll develop is the `Config` class. You can find it in the
[`exercise/lib/config.js`]({{ site.baseurl }}/exercise/lib/config.js) file.
The purpose of the `Config` class is to read the configuration file
and validate the contents. The example configuration file is
[`exercise/config/slack-github-issues.json`]({{ site.baseurl }}/exercise/config/slack-github-issues.json).

If you're completely unfamiliar with unit testing, or unfamiliar with
[Mocha](https://mochajs.org/) and [Chai](http://chaijs.com/), the `Config`
class is a great object to get you acquainted. If you're looking for more of a
challenge, move on to the next chapter.

If you've skipped to this chapter, you can establish the starting state of the
`exercise/` files for this chapter by running:

```sh
$ ./go set-config
```

## What to expect

Getting the configuration right is key to the proper and expected functioning
of the application as a whole. Consequently, this will become one of the
larger classes in the system, performing lots of detailed 
[schema validation]({{ site.baseurl }}/concepts/schema-validation/) checks.
However, it will also be one of the most straightforward to test, as:

- it takes plain
  [JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
  as input,
- either does nothing or raises an error upon construction,
- holds immutable data for the rest of the application, and
- has no other behavior.

## Validating the configuration data

The beginning of the `config.js` file, where the `Config` constructor is
defined, looks like this:

```js
/* jshint node: true */

'use strict';

module.exports = Config;

function Config(configuration) {
  var config = configuration ||
        parseConfigFromEnvironmentVariablePathOrUseDefault();

  for (var fieldName in config) {
    if (config.hasOwnProperty(fieldName)) {
      this[fieldName] = config[fieldName];
    }
  }
  this.validate();
}
```

_Note_: Every JavaScript file in this application will begin with
[jshint option directives](http://jshint.com/docs/options/)
and the
['use strict' directive](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode).

When the `Config` object is constructed, it takes configuration data either as
a parameter or it gets the path from an environment variable. It then assigns
every property from the `config` object to itself. The
[`hasOwnProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty)
check ensures only properties defined by the configuration file itself are
copied.

Once all the properties are copied, the object is then validated against a
[schema]({{ site.baseurl }}/concepts/schema-validation/), defined just below
the constructor:

```js
var schema = {
  requiredTopLevelFields: {
    githubUser: 'GitHub username',
    githubTimeout: 'GitHub API timeout limit in milliseconds',
    slackTimeout: 'Slack API timeout limit in milliseconds',
    successReaction: 'emoji used to indicate an issue was successfully filed',
    rules: 'Slack-reaction-to-GitHub-issue rules'
  },
  requiredRulesFields: {
    reactionName: 'name of the reaction emoji triggering the rule',
    githubRepository: 'GitHub repository to which to post issues'
  },
  optionalRulesFields: {
    channelNames: 'names of the Slack channels triggering the rules; ' +
      'leave undefined to match messages in any Slack channel'
  }
};
```

Let's take a look at the starting implementation for `validate()`. It makes
sure that all of the fields required by the schema are present, and doesn't
contain any fields missing from the schema. It performs a series of checks to
accumulate as many errors as possible before throwing an
[`Error`](https://nodejs.org/api/errors.html).

```js
Config.prototype.validate = function() {
  var errors = [],
      errMsg;

  this.checkRequiredTopLevelFields(errors);
  this.checkForUnknownFieldNames(errors);
  this.checkRequiredRulesFields(errors);
  this.checkForUnknownRuleFieldNames(errors);

  if (errors.length !== 0) {
    errMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');
    throw new Error(errMsg);
  }
};
```

## Testing a valid configuration object

Open up the
[`exercise/test/config-test.js`]({{ site.baseurl }}/exercise/test/config-test.js)
file in your favorite editor. You should see this:

```js
/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

describe('Config', function() {
  it('should validate a valid configuration', function() {
  });
});
```

The first thing we want to do is to make sure that the `Config` constructor
builds a valid object without errors. We'll also need to import the Chai
assetion framework. Update the top of the file to reflect the following
`require` statements:

```js
var Config = require('../lib/config');
var chai = require('chai');
var expect = chai.expect;
```

Then add an implementation to the `'should validate a valid configuration'`
test.  Pass an empty data object into the `Config` constructor, and verify
that the new `Config` object contains the same data as the original JSON
object.

The most expedient comparison is to use
[`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
on both objects and to compare the result. It's a blunt instrument, but for
our small case, it gets the job done. In this test, we'll use the `expect`
form of [Chai BDD-style assertions](http://chaijs.com/api/bdd/).

The test should look something like:

```js
  it('should validate a valid configuration', function() {
    var configData = {
          // Fill this in with valid data in the next step
        },
        config = new Config(configData);

    expect(JSON.stringify(config)).to.equal(JSON.stringify(configData));
  });
```

Good tests fail when they should, so at this point, verify that the test
fails by running `npm test`. To limit the output to just the `Config` tests,
run it as `npm test -- --grep '^Config '`:

```sh
$ npm test -- --grep '^Config '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Config "

[12:39:51] Using gulpfile .../unit-testing-node/gulpfile.js
[12:39:51] Starting 'test'...


  Config
    1) should validate a valid configuration


  0 passing (7ms)
  1 failing

  1) Config should validate a valid configuration:
     Error: Invalid configuration:
  missing githubUser
  missing githubTimeout
  missing slackTimeout
  missing successReaction
  missing rules
    at Config.validate (exercise/lib/config.js:46:11)
    at new Config (exercise/lib/config.js:14:8)
    at Context.<anonymous> (exercise/test/config-test.js:27:14)




[12:39:52] 'test' errored after 50 ms
[12:39:52] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

Now add some valid sample data with all the required fields, perhaps copied
from [`exercise/config/slack-github-issues.json`]({{ site.baseurl }}/exercise/config/slack-github-issues.json).
Now when you run `npm test`, you should see something like this:

```sh
$ npm test -- --grep Config

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "Config"


[12:29:20] Using gulpfile .../unit-testing-node/gulpfile.js
[12:29:20] Starting 'test'...


  Config
    ✓ should validate a valid configuration


  1 passing (8ms)

[12:29:20] Finished 'test' after 58 ms
```

## Testing `checkReqiredTopLevelFields()`

We've now verified that our `Config` will accept a valid configuration.
However, we'd like to remain confident that `Config` will detect every missing
top-level field. Rather than throwing the original test failure away, we will
create a new test from it that _expects_ the validation to fail.

Let's add a new test immediately after the first, using the following outline:

```js
  it('should raise errors for missing required fields', function() {
    var errors = [
          // List the expected error messages here
        ],
        errorMessage = 'Invalid configuration:\n  ' + errors.join('\n  ');

    expect(function() { return new Config({}); }).to.throw(Error, errorMessage);
  });
```

You may notice that even if the `errors` list is empty, the test will still
pass. This is because the `throw` directive will do a partial match against
the error message. For now, we'll let it slide; we'll do more exact matching
against log messages later. However, to confirm that the message is raised as
expected, do one the following and inspect the error message:

- misspell a member of `errors` or reorder some of the elements
- change the `to.throw` expression to `to.not.throw`

## Testing the optional `channelNames` field

`channelNames` is the only optional field, and it's an optional field for
`rules` items. If it is present, it names the channels matched by the rule.
If it is absent, the rule will match any channel.

In [`exercise/config/slack-github-issues.json`]({{ site.baseurl }}/exercise/config/slack-github-issues.json),
the only rule defined does not contain a `channelNames` field. To test that
`channelNames` is rightfully allowed by validation, create a new test case
called `'should validate a rule specifying a channel'`. Copy the
implementation from  `'should validate a valid configuration'`, but update the
`configData` variable in one of two ways:

- directly update the existing `rules` member to have a `channelNames` field
- call `configData.rules.push()` to add a new member with `channelNames` field
  defined

Do not worry about the duplicated code and data for now. We will address this
in a later step.

## Testing and implementing the remaining functions

At this point you're ready to implement the remaining validation functions.
Here's roughly how they should be implemented and tested.

### `checkForUnknownFieldNames()`

This is the inverse of `checkRequiredTopLevelFields()`. You will need to
iterate over every property of `this` and compare each against the properties
in the schema. Since the schema only defines `requiredTopLevelFields`, not
optional fields, this is the only set of fields you need to check against. You
will also need to perform the `hasOwnProperty()` check on properties for both
objects.

To test, create a new test case called `'should raise errors for unknown
properties'` starting with this template:

```js
  it('should raise errors for unknown top-level properties', function() {
    var configData = {
          // Add your test data with unknown properties
        },
        errors = [
          // Add your expected error messages here
        ],
        errorMessage = 'Invalid configuration:\n  ' + errors.join('\n  ');

    expect(function() { return new Config(configData); })
      .to.throw(Error, errorMessage);
  });
```

Again, do not worry that several of the tests contain duplicate logic and
data. We will address this in a later step.

### `checkRequiredRulesFields()`

This function is very similar to `checkRequiredTopLevelFields()`, except that
it validates individual items in the `rules` field using the schema's
`requiredRulesFields` property. It may be helpful to include the numeric index
of the rule in the list when constructing the error message.

You will need to detect when `this.rules` is `undefined`. Even though
`rules` is required, and will always be present when validation succeeds, it
may not always be present when validation is taking place. This is because the
validation will try to collect as many errors as possible, and will not stop
just because `rules` is not present.

To test, create a new test case called `'should raise errors for missing
required rules fields'`. Use the same template from
`checkForUnknownFieldNames()` to start. Just copy and paste; we'll address the
duplication later.

### `checkForUnknownRuleNames()`

This function requires the same test for `this.rules` as
`checkRequiredRulesFields()`, but the logic performed on each rule will need
to resemble `checkForUnknownFieldNames()`. However, the schema does define
`optionalRulesFields`, so you will have to check against both this set of
properties as well as `requiredRulesFields`.

Since the behavior is similar, you can add to the previous `'should raise
errors for unknown properties'` test rather than writing a new test. However,
it's generally good to have separate tests for distinct concerns at this
level, so feel free to make a new test if you wish.

### `parseConfigFromEnvironmentVariablePathOrUseDefault()`

This function should read `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` from
[`process.env`](https://nodejs.org/api/process.html#process_process_env)
to discover the location of the configuration file. If that variable is not
defined, it should attempt to read `config/slack-github-issues.json`. It
should return the JSON object parsed from the file, using
[`fs.ReadFileSync()`](https://nodejs.org/api/fs.html#fs_fs_readfilesync_file_options)
to read the contents.

The tests for this function need only validate that the `Config` object reads
the file properly. All of the success and failure cases have been covered by
the other tests, using data defined in the test itself.

**Don't forget to `require('fs')` and `require('path')` as needed.**

The tricky part is managing the presence of
`HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH`. We want to ensure that this variable
is defined for this test, but not for any other. Add the following
[`before() and afterEach()` hooks](https://mochajs.org/#hooks) to the top of
the fixture:

```js
describe('Config', function() {

  before(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  afterEach(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });
```

This ensures that the variable is cleared before any of the tests run, and
cleared after each of the tests run.

Now define the following test cases:

- `'should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH'`
- `'should load from config/slack-github-issues.json by default'`

Both tests should load the test data directly into the test case using:

```js
    var testConfig = require('../config/slack-github-issues.json'),
        config;
```

`'should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH'` should assign a
path to the config file using:

```js
    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      path.dirname(__dirname), 'config', 'slack-github-issues.json');
```

Both tests should use the `JSON.stringify()` method of comparing the original
data to the validated `Config` object.

Note that at the moment, both tests are using the same data file. Though two
different code paths are exercised, the test assertions are the same. This
means that the environment variable-based test will still pass even if that
code path is removed. However, we will fix this issue in the next step.

## Consolidating data with `test/helpers`

You may have noticed a lot of [repetition in the
tests]({{ site.baseurl }}/concepts/repetition-in-tests/), both of the test
logic and of the test data. The logic is minimal enough that it is of no
particular concern; the data, however, could be better utilized. Most of the
data could be shared, with each individual test altering it as necessary to
exercise a different code path.

To that end, there is a
[`test/helpers/test-config.json`]({{ site.baseurl }}/exercise/test/helpers/test-config.json)
file containing a valid configuration. However, using `require()` to import
this file directly will cause all of the tests to manipulate the same single
object. This sharing of state leads to interdependencies between test cases,
which is the opposite of what we want. Each test should be able to pass or
fail independently of state changes from other tests.

For that reason, the
[`test/helpers` module]({{ site.baseurl }}/exercise/test/helpers/index.js)
module provides a `baseConfig()` method that makes a fresh copy of this data:

```js
/* jshint node: true */

'use strict';

var testConfig = require('./test-config.json');

exports = module.exports = {
  baseConfig: function() {
    return JSON.parse(JSON.stringify(testConfig));
  }
};
```

Add this line to the top of the `exercises/test/config-test.js` file:

```js
var helpers = require('./helpers');
```

Now replace most of your test data definitions with calls to
`helpers.baseConfig()`, and then update the resulting data structure as needed
for each specific test. The specific conditions examined by each test should
become easier to see.

## Updating the `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` test

Also, you can now update `'should load from
HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH'` to read:

```js
    var testConfig = require('./helpers/test-config.json'),
        config;

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      __dirname, 'helpers', 'test-config.json');
    config = new Config();
```

Notice in particular that `path.dirname(__dirname)` has become just
`__dirname`.

Since the data in `test-config.json` is different from the data in
`slack-github-issues.json`, you can now be sure that the tests are testing
different code paths.

We will build up the `test/helpers` module with more data helpers
throughout the course of the exercise. Sharing common test data in this way
makes it easier to write tests for other components. It also helps verify that
common data structures propagate throughout the application as expected.

## Check your work

By this point, all of the `Config` tests should be passing:

```sh
$ npm test -- --grep '^Config '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Config "

[12:16:44] Using gulpfile .../unit-testing-node/gulpfile.js
[12:16:44] Starting 'test'...


  Config
    ✓ should validate a valid configuration
    ✓ should raise errors for missing required fields
    ✓ should validate a rule specifying a channel
    ✓ should raise errors for unknown top-level properties
    ✓ should raise errors for missing required rules fields
    ✓ should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH
    ✓ should load from config/slack-github-issues.json by default


  7 passing (10ms)

[12:16:45] Finished 'test' after 83 ms
```

Now that you're all finished, compare your solutions to the code in
[`solutions/00-config/lib/config.js`]({{ site.baseurl }}/solutions/00-config/lib/config.js)
and
[`solutions/00-config/test/config-test.js`]({{ site.baseurl }}/solutions/00-config/test/config-test.js).

You may wish to `git commit` your work to your local repo at this point. After
doing so, try copying the `config.js` file from `solutions/00-config` into
`exercises` to see if it passes the test you wrote. Then run `git reset --hard
HEAD` and copy the test files instead to see if your implementation passes.
