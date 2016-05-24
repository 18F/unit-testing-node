---
title: Logger class
---
The `Logger` class is a thin wrapper over the `logger` member of the Hubot
instance. Logger will have `info` and `error` methods that add the script name
and message ID as prefixes to each log message. You can find it in the
[`exercise/lib/logger.js`]({{ site.baseurl }}/exercise/lib/logger.js) file.

If you've skipped ahead to this chapter, you can establish the starting state
of the `exercise/` files for this chapter by running:

```sh
$ ./go set-logger
```

## What to expect

Remember that this program will run as a Hubot plugin, and that Hubot runs as
a long-lived service. This means your plugin will also run as a long-lived
service. In addition, your plugin may handle multiple incoming messages at
once, making multiple concurrent requests to Slack and GitHub in the process.

Though logging isn't core to the overall correct functioning of the program,
these considerations make it a critical component of operational monitoring
and debugging. In this chapter, you will learn to:

- Use
  [`Function.prototype.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
  to add arguments to the beginning of the [`arguments`
  object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments)
  for a function call
- Use the [`sinon` library](http://sinonjs.org/) to create
  [test doubles](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html)

## Starting to build `Logger`

The beginning of the `logger.js` file, where the `Middleware` constructor is
defined, looks like this:

```js
'use strict';

module.exports = Logger;

function Logger(logger) {
  this.logger = logger;
}

Logger.prototype.info = function() {
};
```

The contract for `info` has the following characteristics:

- It will pass all of its arguments through to `this.logger.info`.
- Before doing so, it will inject the name of the script as the first argument
  passed to `this.logger.info`.
- If the first argument is not `undefined` or `null`, it will be interpreted
  as the **message ID** and encoded into the log message prefix.

The first thing you need to do is create a constant for the log message prefix
based on the name of the script's package. Make it a constant member of the
constructor so that it's programmatically accessible to the test:

```js
var scriptName = require('../package.json').name;

// ...snip...

Logger.PREFIX = scriptName + ':';
```

## Manipulating `arguments`

The [`arguments`
object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments)
is a special _array-like object_ defined to hold all of the arguments passed
to a function. It is not, however, an
[`Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
instance. It has a very limited set of methods available, so you must convert
it to an `Array` before manipulating it in any way.

One common way to do this is to call `Array.prototype.slice.call` with
`arguments` as the argument:

```js
  var args = Array.prototype.slice.call(arguments);
```

However, [this practice leaks the `arguments` object outside of the immediate
function call, preventing any potential
optimizations](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments).
You needn't be too concerned with performance in your logging wrapper because
logging is an I/O-bound operation to begin with. That said, it's not too much
bother to do the safe thing and manually create a new `Array`:

```js
  var args = new Array(arguments.length),
      i;

  for (i = 0; i !== args.length; ++i) {
    args[i] = arguments[i];
  }
```

## Adding the prefix to the argument array

Setting aside the message ID case for now, adding `Logger.PREFIX` to the front
of `args` is easy:

```js
  args.unshift(Logger.PREFIX);
```

But how do we pass these arguments along to `this.logger.info` as though that
method had been called directly? This is where
[`Function.prototype.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
comes in. Every `Function` instance has an `apply` method that binds the
function's `this` variable explicitly and binds an array-like object as its
`arguments` object. Therefore, all that's needed to finish the function is:

```js
  this.logger.info.apply(this.logger, args);
```

## Testing `Logger.info`

The
[`exercise/test/logger-test.js`]({{ site.baseurl }}/exercise/test/logger-test.js)
currently contains:

```js
'use strict';

describe('Logger', function() {
  it('should prefix info messages with the script name', function() {
  });
});
```

Since `Logger.info` calls `this.logger.info`, which has side effects but no
return value, use the [`sinon` library](http://sinonjs.org/) to create a [test
spy](http://sinonjs.org/docs/#spies) in your test. The spy will remember the
arguments it was called with, so you may validate that the method was called
as expected.

First, add the following statements to the top of the test file:

```js
var Logger = require('../lib/logger');
var sinon = require('sinon');
var chai = require('chai');

chai.should();
```

Now, add the test spy to the test fixture:

```js
describe('Logger', function() {
  var logger, infoSpy;

  beforeEach(function() {
    infoSpy = sinon.spy();
    logger = new Logger({ info: infoSpy });
  });
```

As you can see, testing your intended behavior becomes very straightforward.
Remember that you should interpret the first argument (if it's not `undefined`
or `null`) as a message ID to incorporate into the log prefix:

```js
  it('should prefix info messages with the script name', function() {
    logger.info(null, 'this', 'is', 'a', 'test');
    infoSpy.calledOnce.should.be.true;
    infoSpy.args[0].should.eql([Logger.PREFIX, 'this', 'is', 'a', 'test']);
  });
```

Now run the test. You should see this:

```sh
$ npm test -- --grep '^Logger '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Logger "

[20:56:26] Using gulpfile .../unit-testing-node/gulpfile.js
[20:56:26] Starting 'test'...


  Logger
    1) should prefix info messages with the script name


  0 passing (12ms)
  1 failing

  1) Logger should prefix info messages with the script name:

      AssertionError: expected [ Array(6) ] to deeply equal [ Array(5) ]
      + expected - actual

       [
         "18f-unit-testing-node:"
      -  [null]
         "this"
         "is"
         "a"
         "test"

    at Context.<anonymous> (exercise/test/logger-test.js:24:28)




[20:56:26] 'test' errored after 136 ms
[20:56:26] Error in plugin 'gulp-mocha'
Message:
    1 test failed.
npm ERR! Test failed.  See above for more details.
```

## Handling the message ID argument

Yes, the test is broken. Remember: _Good tests fail when they should_, and
this one is doing the right thing because you _haven't_ handled the message ID
argument yet. Before adding the behavior to fix the test, add another failing
test case expressing the behavior you expect when the message ID is specified:

```js
  it('should prefix info messages with the script name + msg ID', function() {
    logger.info('U5150+COU812', 'msgID', 'test');
    infoSpy.calledOnce.should.be.true;
    infoSpy.args[0].should.eql(
      [Logger.PREFIX, 'U5150+COU812:', 'msgID', 'test']);
  });
```

Notice that the new test expects a colon added to the end of the message ID
(`U5150+COU812:`). With these two tests in place, add the logic needed to get
both tests to pass. After creating the `args` array, but before adding
`Logger.PREFIX` to the front, add the colon to the first argument if it is
defined. Otherwise, remove the first argument:

```js
  if (args.length !== 0 && args[0]) {
    args[0] = args[0] + ':';
  } else {
    args.shift();
  }
```

Run the tests again. Both should now pass.

## Implementing and testing `Logger.error`

You'll want to do the _exact same thing_ with `Logger.error`, except that
you'll want to adjust the arguments for `this.logger.error` instead of
`this.logger.info`.  Add a new spy to the fixture for `this.logger.error`:

```js
describe('Logger', function() {
  var logger, infoSpy, errorSpy;

  beforeEach(function() {
    infoSpy = sinon.spy();
    errorSpy = sinon.spy();
    logger = new Logger({ info: infoSpy, error: errorSpy });
  });
```

You can even copy `Logger.info` and the first test, replacing `info` with
`error` everywhere it occurs. Go ahead and make these copies now and make sure
that all the tests pass.

Even if all the tests pass, you still have to face the concern that the
duplication between `Logger.info` and `Logger.error` is inconvenient, ugly,
and potentially error-prone. (On the contrary, [well-crafted repetition in
tests]({{ site.baseurl }}/concepts/repetition-in-tests/) is often helpful to
make the unique characteristics of each test stand out.) How can you factor
out the common code without losing the ability to manipulate the original
`arguments` object?

As it turns out, [you can safely call `Function.prototype.apply` to bind
`arguments` to a new
function](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#what-is-safe-arguments-usage).
First, extract a common function from the existing `Logger.info` and
`Logger.error` methods:

```js
function addPrefix() {
  var args = new Array(arguments.length),
      i;

  for (i = 0; i !== args.length; ++i) {
    args[i] = arguments[i];
  }

  if (args.length !== 0 && args[0]) {
    args[0] = args[0] + ':';
  } else {
    args.shift();
  }
  args.unshift(Logger.PREFIX);
  return args;
}
```

Next, replace both `Logger.info` and `Logger.error` with:

```js
Logger.prototype.info = function() {
  this.logger.info.apply(this.logger, addPrefix.apply(null, arguments));
};

Logger.prototype.error = function() {
  this.logger.error.apply(this.logger, addPrefix.apply(null, arguments));
};
```

Note that because the functions differ only in which `this.logger` function
gets applied, you don't _need_ to copy and update more than the first test.
You could copy the other one, but given that the bulk of the implementation is
shared with `Logger.info` via `addPrefix`, that would be of dubious value.

## Retrofitting `Logger` into `Config`

In production, the script will read the configuration from either
`config/slack-github-issues.json` in the current directory or from the file
specified by the `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` environment variable.
It would be good to log the file from which the program reads its
configuration. To that end, pass an instance of `Logger` into the `Config`
constructor:

```js
function Config(configuration, logger) {
  var config = configuration ||
        parseConfigFromEnvironmentVariablePathOrUseDefault(logger);
```

Thanks to this conditional, you can ignore the `logger` variable in most of
the tests. Now to update the other function:

```js
function parseConfigFromEnvironmentVariablePathOrUseDefault(logger) {
  var configPath = (process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH ||
      'config/slack-github-issues.json'),
    errorPrefix = 'failed to load configuration from ' + configPath + ': ';
  logger.info(null, 'reading configuration from', configPath); 

  // ...the try...catch block...
}
```

So now, in `exercise/test/config-test.js`, you need to add the following:

```js
var Logger = require('../lib/logger');
```

You also need to add this:

```js
var sinon = require('sinon');
```

and update two tests. The first is
`should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH`:

```js
  it('should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function() {
    var testConfig = require('./helpers/test-config.json'),
        logger = new Logger(console),
        configPath = path.join(__dirname, 'helpers', 'test-config.json'),
        config;

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = configPath;
    sinon.stub(logger, 'info');
    config = new Config(null, logger);
    expect(JSON.stringify(config)).to.eql(JSON.stringify(testConfig));
    expect(logger.info.args).to.eql([
      [null, 'reading configuration from', configPath]
    ]);
  });
```

Notice that you're not actually exercising the `logger.info` logic; you've
already done that in the `Logger` tests. Rather, you're using a sinon stub to
ensure that `logger.info` is called as you expect it to be.

At this point, update the `should load from config/slack-github-issues.json by
default` test:

```js
  it('should load from config/slack-github-issues.json by default', function() {
    var testConfig = require('../config/slack-github-issues.json'),
        logger = new Logger(console),
        configPath = path.join('config', 'slack-github-issues.json'),
        config;

    sinon.stub(logger, 'info');
    config = new Config(null, logger);
    expect(JSON.stringify(config)).to.eql(JSON.stringify(testConfig));
    expect(logger.info.args).to.eql([
      [null, 'reading configuration from', configPath]
    ]);
  });
```

In a similar way, update the `should raise and error if the config file...`
tests. Rather than refactoring the `Config` code to catch and log the error,
[you want to allow it to propagate so the `Config` object never
exists]({{ site.baseurl }}/concepts/valid-by-contract/). The code calling the
`Config` constructor can (and should!) catch and log the error.

Run `npm test -- --grep '^Config '` to ensure that the tests continue to pass.
Try changing the `Logger` code or the test expectations to make them break, to
make sure they're testing what you want them to test.

## Check your work

By this point, all of the `Logger` tests should be passing:

```sh
$ npm test -- --grep '^Logger'

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Logger"

[21:21:45] Using gulpfile .../unit-testing-node/gulpfile.js
[21:21:45] Starting 'test'...


  Logger
    ✓ should prefix info messages with the script name
    ✓ should prefix info messages with the script name + msg ID
    ✓ should prefix error messages with the script name


  3 passing (12ms)

[21:21:45] Finished 'test' after 139 ms
```

Now that you're finished, compare your solutions to the code in
[`solutions/04-logger/lib/logger.js`]({{ site.baseurl }}/solutions/04-logger/lib/logger.js)
and
[`solutions/04-logger/test/logger-test.js`]({{ site.baseurl }}/solutions/04-logger/test/logger-test.js).

At this point, `git commit` your work to your local repo. After you do, copy
the `logger.js` file from `solutions/04-logger/lib` into `exercises/lib` to
see if it passes the test you wrote. Then run `git reset --hard HEAD` and copy
the test files instead to see if your implementation passes. If a test case
fails, review the section of this chapter pertaining to the failing test case,
then try to update your code to make the test pass.
