---
title: Config class
---
The first object we'll develop is the `Config` class. You can find this class
in the [`exercise/lib/config.js`]({{ site.baseurl }}/exercise/lib/config.js)
file. The purpose of the `Config` class is to read the configuration file
and validate the contents. The example configuration file is
[`exercise/config/slack-github-issues.json`]({{ site.baseurl }}/exercise/config/slack-github-issues.json).

If you're completely unfamiliar with unit testing, or unfamiliar with
[Mocha](https://mochajs.org/) and [Chai](http://chaijs.com/), the `Config`
class is a great object to get you acquainted. If you're looking for more of a
challenge, move on to the next chapter. And if you've skipped ahead to this
chapter, you can establish the starting state of the `exercise/` files for
this chapter by running:

```sh
$ ./go set-config
```

## What to expect

Getting the configuration right is key to the proper and expected functioning
of the application as a whole. Consequently, this will become one of the
larger classes in the system, performing lots of detailed
[schema validation]({{ site.baseurl }}/concepts/schema-validation/) checks.
However, it will also be one of the most straightforward to test, as it takes
plain [JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
as input, either does nothing or raises an error upon construction, holds
immutable data for the rest of the application, and has no other behavior.

## Validating the configuration data

The beginning of the `config.js` file, where the `Config` constructor is
defined, looks like this:

```js
'use strict';

module.exports = Config;

function Config(configuration) {
  var config = configuration ||
        parseConfigFromEnvironmentVariablePathOrUseDefault();

  validate(config);

  for (var fieldName in config) {
    if (config.hasOwnProperty(fieldName)) {
      this[fieldName] = config[fieldName];
    }
  }
}
```

_Note_: Every JavaScript file in this application will begin with
the ['use strict' directive](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode).

When the `Config` object is constructed, it takes configuration data either as
a parameter or it gets the path from an environment variable.

We then validate the data object against a
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
  optionalTopLevelFields: {
    githubApiBaseUrl: 'Alternate base URL for GitHub API requests',
    slackApiBaseUrl: 'Alternate base URL for Slack API requests'
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

Note that we do not call assign any values to `this` or call any methods on
`this` until `validate` succeeds. [This is a good practice regardless of
language, as it makes it easier to reason about the state of the object, and
can preclude security issues]({{ site.baseurl }}/concepts/valid-by-contract/).
Once validation succeeds, `Config` then assigns every property from the
`config` object to itself. The
[`hasOwnProperty`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty)
check ensures that the only properties copied into the `Config` are those defined by the configuration file itself, excluding those inherited from
[`Object`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object#Object_instances_and_Object_prototype_object).

Let's take a look at the starting implementation for `validate`. It makes sure
that all of the fields required by the schema are present, and doesn't contain
any fields missing from the schema. It performs a series of checks to
accumulate as many errors as possible before throwing an [`Error`](https://nodejs.org/api/errors.html).
Therefore, any time the `Config` constructor _doesn't_ throw an `Error`, [we
are guaranteed that `Config` contains valid data by
contract]({{ site.baseurl }}/concepts/valid-by-contract/).

```js
function validate(config) {
  var errors = [],
      errMsg;

  checkRequiredTopLevelFields(config, errors);
  checkForUnknownFieldNames(config, errors);

  if (config.rules) {
    checkRequiredRulesFields(config, errors);
    checkForUnknownRuleFieldNames(config, errors);
  }

  if (errors.length !== 0) {
    errMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');
    throw new Error(errMsg);
  }
}
```

## Testing a valid configuration object

Open up the
[`exercise/test/config-test.js`]({{ site.baseurl }}/exercise/test/config-test.js)
file in your favorite editor. You should see this:

```js
'use strict';

describe('Config', function() {
  it('should validate a valid configuration', function() {
  });
});
```

The first thing you want to do is to make sure that the `Config` constructor
builds a valid object without errors. You'll also need to import the Chai
assetion framework. Update the top of the file to reflect the following
`require` statements:

```js
var Config = require('../lib/config');
var chai = require('chai');
var expect = chai.expect;
```

Then add an implementation to the `'should validate a valid configuration'`
test.  Pass an empty data object into the `Config` constructor and verify
that the new `Config` object contains the same data as the original JSON
object.

The most expedient comparison is to use
[`JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
on both objects and to compare the result. It's a blunt instrument, but for
this small case, it gets the job done. In this test, you'll use the `expect`
form of [Chai BDD-style assertions](http://chaijs.com/api/bdd/).

The test should look something like this:

```js
  it('should validate a valid configuration', function() {
    var configData = {
          // Fill this in with valid data in the next step
        },
        config = new Config(configData);

    expect(JSON.stringify(config)).to.equal(JSON.stringify(configData));
  });
```

Good tests fail when they should. At this point, verify that the test fails by
running `npm test`. To limit the output to just the `Config` tests, run it as
`npm test -- --grep '^Config '`:

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
    at validate (exercise/lib/config.js:58:11)
    at new Config (exercise/lib/config.js:13:3)
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

## Testing `checkRequiredTopLevelFields`

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

_Note_: The `return new Config` call must be wrapped in a function so that
`expect` will execute it. Otherwise the `return new Config` expression will
throw an `Error` _before_ the test calls `expect`.

You may notice that even if the `errors` list is empty, the test will still
pass. This is because the `throw` directive will do a partial match against
the error message. For now, we'll let it slide; we'll do more exact matching
against log messages later. However, to confirm that the message is raised as
expected, do one the following and inspect the error message:

- Misspell a member of `errors` or reorder some of the elements
- Change the `to.throw` expression to `to.not.throw`

## Testing the optional fields

The top level config defines the optional fields `githubApiBaseUrl` and
`slackApiBaseUrl`. We will use these fields to override built-in defaults from
`SlackClient` and `GitHubClient` in several later tests.

For the `rules` field, `channelNames` is the only optional field. If it's
present, it names the channels matched by the rule. If it is absent, the rule
will match any channel.

In [`exercise/config/slack-github-issues.json`]({{ site.baseurl }}/exercise/config/slack-github-issues.json),
neither `githubApiBaseUrl` nor `slackApiBaseUrl` are defined, and the only
rule defined does not contain a `channelNames` field. To test that these
fields are rightfully allowed by validation, create a new test case called
`'should validate optional config fields'`. Copy the implementation from
`'should validate a valid configuration'`, but add values for
`githubApiBaseUrl` and `slackApiBaseUrl`, and update the `configData.rules`
member by either:

- Directly updating the existing `rules` member to have a `channelNames` field
- Calling `configData.rules.push` to add a new member with `channelNames`
  field defined

Don't worry about the duplicated code and data for now. We will address this
in a later step.

## Testing and implementing the remaining functions

At this point you're ready to implement the remaining validation functions.
Here's roughly how they should be implemented and tested.

### `checkForUnknownFieldNames`

This is the inverse of `checkRequiredTopLevelFields`. You will need to
iterate over every property of `config` and compare each against the required
and optional properties in the schema. You will need to perform the
`hasOwnProperty` check on properties from `config`, as well as from the
`schema.requiredTopLevelFields` and `schema.optionalTopLevelFields`
collections.

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

Again, don't worry that several of the tests contain duplicate logic and
data. We will address this in a later step.

### `checkRequiredRulesFields`

This function is very similar to `checkRequiredTopLevelFields`, except that
it validates individual items in the `rules` field using the schema's
`requiredRulesFields` property. It may be helpful to include the numeric index
of the rule in the list when constructing the error message.

You will need to detect when `config.rules` is `undefined`. Even though
`rules` is required, and will always be present when validation succeeds, it
may not always be present when validation is taking place. This is because the
validation will try to collect as many errors as possible, and will not stop
just because `rules` is not present.

To test, create a new test case called `'should raise errors for missing
required rules fields'`. Use the same template from
`checkForUnknownFieldNames` to start. Just copy and paste; we'll address the
duplication later.

### `checkForUnknownRuleNames`

This function requires the same test for `config.rules` as
`checkRequiredRulesFields`, but the logic performed on each rule will need
to resemble `checkForUnknownFieldNames`. You will have to check each rule's
properties against the property names from both `schema.requiredRulesFields`
and `schema.optionalRulesFields`.

Since the behavior is similar, you can add to the previous `'should raise
errors for unknown properties'` test rather than writing a new test. However,
it's generally good to have separate tests for distinct concerns at this
level, so feel free to make a new test if you wish.

### `parseConfigFromEnvironmentVariablePathOrUseDefault`

This function should read `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` from
[`process.env`](https://nodejs.org/api/process.html#process_process_env)
to discover the location of the configuration file. If that variable is not
defined, it should attempt to read `config/slack-github-issues.json`. It
should return the JSON object parsed from the file, using
[`fs.ReadFileSync`](https://nodejs.org/api/fs.html#fs_fs_readfilesync_file_options)
to read the contents.

The tests for this function need only validate that the `Config` object reads
the file properly (or throws an appropriate `Error`, which we'll cover
shortly). All of the validation success and failure cases have been covered by
the other tests, using data defined in the test itself.

**Don't forget to `require('fs')` and `require('path')` as needed.** Use
[`path.join`](https://nodejs.org/api/path.html#path_path_join_path1_path2) in
your implementation to ensure that the default configuration path is portable
across operating systems.

The tricky part is managing the presence of
`HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH`. We want to ensure that this variable
is defined for this test, but not for any other. Add the following
[`before and afterEach` hooks](https://mochajs.org/#hooks) to the top of
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

Both tests should use the `JSON.stringify` method of comparing the original
data to the validated `Config` object.

Note that, at the moment, both tests are using the same data file. Though two
different code paths are exercised, the test assertions are the same. This
means that the environment variable-based test will still pass even if that
code path is removed. However, we will fix this issue in a later step.

### Testing `parseConfigFromEnvironmentVariablePathOrUseDefault` error cases

Should loading the file or parsing its contents fail, we should decorate the
resulting `Error.message` with contextual information and rethrow it. Add the
following `var errorPrefix` declaration and [`try...catch`
block](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)
to the end of the function (presuming `configPath` holds either
`HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` or the default config path):

```js
  var errorPrefix = 'failed to load configuration from ' + configPath + ': ';

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    if (err instanceof SyntaxError) {
      errorPrefix = errorPrefix + 'invalid JSON: ';
    }
    err.message = errorPrefix + err.message;
    throw err;
  }
```

The test cases for the errors are fairly straightforward. We'll take advantage
of the [`__dirname`](https://nodejs.org/api/globals.html#globals_dirname) and
[`__filename`](https://nodejs.org/api/globals.html#globals_filename) global
variables to point `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` at nonexistent and
malformed config files:

```js
  it('should raise an error if the config file does not exist', function() {
    var configPath = path.join(__dirname, 'nonexistent-config-file'),
        errorMessage = 'failed to load configuration from ' + configPath + ': ';

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = configPath;
    expect(function() { return new Config(); })
      .to.throw(Error, errorMessage);
  });

  it('should raise an error if the config file isn\'t valid JSON', function() {
    var errorMessage = 'failed to load configuration from ' + __filename +
          ': invalid JSON: ';

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = __filename;
    expect(function() { return new Config(); })
      .to.throw(Error, errorMessage);
  });
```

Run the tests and ensure they pass before moving onto the next section.

## Eliminating duplication

You may have noticed an uncanny resemblance in the logic for these pairs of
functions:

- `checkRequiredTopLevelFields` and `checkRequiredRulesFields`
- `checkOptionalTopLevelFields` and `checkOptionalRulesFields`

Now that you have a thorough battery of tests covering these functions, let's
try to factor out some common logic to share between each pair. For example,
our current implementation of `checkRequiredTopLevelFields` looks like:

```js
Config.prototype.checkRequiredTopLevelFields = function(errors) {
  var fieldName;

  for (fieldName in schema.requiredTopLevelFields) {
    if (schema.requiredTopLevelFields.hasOwnProperty(fieldName) &&
        !config.hasOwnProperty(fieldName)) {
      errors.push('missing ' + fieldName);
    }
  }
};
```

`checkRequiredRulesFields` likely looks very similar, except that the logic is
repeated for each element of `config.rules`. How can we effectively factor out
this duplication?

The answer is to [convert the loop into a collection pipeline of distinct,
composable
steps](http://martinfowler.com/articles/refactoring-pipelines.html). The first
step is to convert the `for (fieldName in schema.requiredTopLevelFields)` to:

```js
function checkRequiredTopLevelFields(config, errors) {
  Object.keys(schema.requiredTopLevelFields).forEach(function(fieldName) {
    if (!config.hasOwnProperty(fieldName)) {
      errors.push('missing ' + fieldName);
    }
  });
}
```

[`Object.keys`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys)
return an array of an object's own properties that we can iterate over via
[`Array.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach).
This is an alternative to the
[`hasOwnProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty)
approach used in the constructor. Run the tests to make sure they all still
pass.

We can now switch the `forEach` function body into two separate pipeline
functions:

```js
function checkRequiredTopLevelFields(config, errors) {
  Object.keys(schema.requiredTopLevelFields)
    .filter(function(fieldName) {
      return !config.hasOwnProperty(fieldName);
    })
    .forEach(function(fieldName) {
      errors.push('missing ' + fieldName);
    });
}
```

Now rather than having one big loop, we have three small ones:

- `Object.keys`: iterates over an object and returns and array of field names
- `.filter`: iterates over the result of `Object.keys` to select only those
  field names that do not appear in the `config` object
- `.forEach`: iterates over the result of `.filter` to push the error messages

Run the tests to make sure they all still pass. We're now ready to extract the
common logic to detect missing fields into a utility function
`filterMissingFields`:

```js
function filterMissingFields(object, requiredFields) {
  return Object.keys(requiredFields).filter(function(fieldName) {
    return !object.hasOwnProperty(fieldName);
  });
}
```

You can now use this utility function to update `checkRequiredTopLevelFields`
to look like:

```js
function checkRequiredTopLevelFields(config, errors) {
  filterMissingFields(config, schema.requiredTopLevelFields)
    .forEach(function(fieldName) {
      errors.push('missing ' + fieldName);
    });
}
```

Run the tests to make sure they all still pass. Now perform a similar
transformation on `checkRequiredRulesFields`, and ensure the tests still pass.
Do the same sort of work for `checkOptionalTopLevelFields` and
`checkOptionalRulesFields`, ensuring the tests pass throughout the process.

This an example of
[refactoring](https://en.wikipedia.org/wiki/Code_refactoring), improving the
structure of existing code to improve readability and to accommodate new
features. Having a solid suite of high-quality automated tests is critical to
making refactoring a regular habit. This in turn allows development to
continue at a sustained high pace, rather than slowing down due to fear of
breaking existing behavior. A good suite of tests will tell you when something
is wrong, and will encourage designs that are easier to change in the long
term.

## Consolidating data with `test/helpers`

You may have noticed a lot of [repetition in the
tests]({{ site.baseurl }}/concepts/repetition-in-tests/), both of the test
logic and of the test data. The logic is minimal enough that it's of no
particular concern; the data, however, could be better utilized. Most of the
data could be shared, with each individual test altering it as necessary to
exercise a different code path.

To that end, there's a
[`test/helpers/test-config.json`]({{ site.baseurl }}/exercise/test/helpers/test-config.json)
file containing a valid configuration. However, using `require` to import
this file directly will cause all of the tests to manipulate the same single
object. This sharing of state leads to interdependencies between test cases,
which is the opposite of what we want. Each test should be able to pass or
fail independently of state changes from other tests.

For that reason, the
[`test/helpers` module]({{ site.baseurl }}/exercise/test/helpers/index.js)
module provides a `baseConfig` method that makes a fresh copy of this data:

```js
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
`helpers.baseConfig`, and then update the resulting data structure as needed
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

[18:00:58] Using gulpfile .../unit-testing-node/gulpfile.js
[18:00:58] Starting 'test'...


  Config
    ✓ should validate a valid configuration
    ✓ should raise errors for missing required fields
    ✓ should validate optional config fields
    ✓ should raise errors for unknown top-level properties
    ✓ should raise errors for missing required rules fields
    ✓ should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH
    ✓ should load from config/slack-github-issues.json by default


  7 passing (11ms)

[18:00:58] Finished 'test' after 73 ms
```

Now that you're finished, compare your solutions to the code in
[`solutions/00-config/lib/config.js`]({{ site.baseurl }}/solutions/00-config/lib/config.js)
and
[`solutions/00-config/test/config-test.js`]({{ site.baseurl }}/solutions/00-config/test/config-test.js).

At this point, `git commit` your work to your local repo. After you do, copy
the `config.js` file from `solutions/00-config/lib` into `exercises/lib` to
see if it passes the test you wrote. Then run `git reset --hard HEAD` and copy
the test files instead to see if your implementation passes. If a test case
fails, review the section of this chapter pertaining to the failing test case,
then try to update your code to make the test pass.
