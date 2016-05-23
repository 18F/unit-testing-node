---
title: Logger class
---
The `Logger` class is a thin wrapper over the `logger` member of the Hubot
instance. Logger will have `info` and `error` methods that add the script name
and message ID as prefixes to each log message. You can find it in the
[`exercise/lib/logger.js`]({{ site.baseurl }}/exercise/lib/logger.js) file.

If you've skipped to this chapter, you can establish the starting state of the
`exercise/` files for this chapter by running:

```sh
$ ./go set-logger
```

## What to expect

Remember that this program will run as a Hubot plugin, and that Hubot runs as
a long-lived service, so our plugin will run indefinitely. Also, our plugin
may handle multiple incoming messages at once, making multiple concurrent
requests to Slack and GitHub in the process.

Though it's not core to the overall correct functioning of the program, these
considerations make logging a critical component of operational monitoring and
debugging. In this chapter we will learn to:

- use
  [`Function.prototype.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
  to add arguments to the beginning of the [`arguments`
  object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments)
  for a function call
- using the [`sinon` library](http://sinonjs.org/) to create
  [test doubles](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html)

## Starting to build `Logger`

The beginning of the `logger.js` file, where the `Middleware` constuctor is
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

The contract for `info` is thus:

- It will pass all of its arguments through to `this.logger.info`.
- Before doing so, it will inject the name of the script as the first argument
  passed to `this.logger.info`.
- If the first argument is not `undefined` or `null`, it will be interpreted
  as the **message ID** and encoded into the log message prefix.

The first thing we need to do is create a constant for the log message prefix
based on the name of the script's package. Let's make it a constant member of
the constructor so that it is programmatically accessible to our test:

```js
var scriptName = require('../package.json').name;

// ...snip...

Logger.PREFIX = scriptName + ':';
```

## Manipulating `arguments`

The [`arguments`
object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments)
is a special "array-like object" defined to hold all of the arguments passed
to a function. It is not, however, an
[`Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
instance. It has a very limited set of methods available, so we must convert
it to an `Array` before manipulating it in any way.

One common way of doing this is calling `Array.prototype.slice.call` with
`arguments` as the argument:

```js
  var args = Array.prototype.slice.call(arguments);
```

However, [this practice leaks the `arguments` object outside of the immediate
function call, preventing any potential
optimizations](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments).
We needn't be too concerned with performance in our logging wrapper, since
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
comes in. Every `Function` instance has an `apply` method binds the function's
`this` variable explicitly and binds an array-like object as its `arguments`
object. Therefore, all that's need to finish our function is:

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

Since `Logger.info` calls `this.logger.info`, which has side-effects but no
return value, we will use the [`sinon` library](http://sinonjs.org/) to create
a [test spy](http://sinonjs.org/docs/#spies) in our test. The spy will
remember the arguments it was called with so we may validate that the method
was called as expected.

First add the following statements to the top of the test file:

```js
var Logger = require('../lib/logger');
var sinon = require('sinon');
var chai = require('chai');

chai.should();
```

Now let's add the test spy to our test fixture:

```js
describe('Logger', function() {
  var logger, infoSpy;

  beforeEach(function() {
    infoSpy = sinon.spy();
    logger = new Logger({ info: infoSpy });
  });
```

Testing our intended behavior becomes very straightforward. Remember that we
will interpret the first argument, if not `undefined` or `null`, as a message
ID to incorporate into the log prefix:

```js
  it('should prefix info messages with the script name', function() {
    logger.info(null, 'this', 'is', 'a', 'test');
    infoSpy.calledOnce.should.be.true;
    infoSpy.args[0].should.eql([Logger.PREFIX, 'this', 'is', 'a', 'test']);
  });
```

Now run the test, and you should see:

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

Yes, our test is broken. Remember: _good tests fail when they should_, and
this one is doing the right thing, because we _haven't_ handled the message ID
argument yet. Before adding the behavior to fix the test, let's add another
failing test case expressing the behavior we expect when the message ID is
specified:

```js
  it('should prefix info messages with the script name + msg ID', function() {
    logger.info('U5150+COU812', 'msgID', 'test');
    infoSpy.calledOnce.should.be.true;
    infoSpy.args[0].should.eql(
      [Logger.PREFIX, 'U5150+COU812:', 'msgID', 'test']);
  });
```

Notice that we expect a colon added to the end of the message ID. With these
two tests in place, let's add the logic needed to get both tests to pass.
After creating the `args` array, but before adding `Logger.PREFIX` to the
front, add the colon to the first argument if it is defined. Otherwise, remove
the first argument:

```js
  if (args.length !== 0 && args[0]) {
    args[0] = args[0] + ':';
  } else {
    args.shift();
  }
```

Run the tests again, and now both should pass.

## Implementing and testing `Logger.error`

We want to do the _exact same thing_ with `Logger.error`, except that we want
to adjust the arguments for `this.logger.error` instead of `this.logger.info`.
First, let's add a new spy to our fixture for `this.logger.error`:

```js
describe('Logger', function() {
  var logger, infoSpy, errorSpy;

  beforeEach(function() {
    infoSpy = sinon.spy();
    errorSpy = sinon.spy();
    logger = new Logger({ info: infoSpy, error: errorSpy });
  });
```

We can even copy `Logger.info` and our first test, replacing `info` with
`error` everywhere it occurs. Go ahead make these copies now, and ensure that
the tests all pass.

The only problem is, that duplication between `Logger.info` and `Logger.error`
is inconvenient, ugly, and potentially error-prone. (On the contrary, 
[well-crafted repetition in tests]({{ site.baseurl }}/concepts/repetition-in-tests/)
is often helpful to make the unique characteristics of each test stand out.)
How can we factor out the common code, without losing the ability to
manipulate the original `arguments` object?

As it turns out, [we can safely call `Function.prototype.apply` to bind
`arguments` to a new
function](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#what-is-safe-arguments-usage).
First we'll extract a common function from our existing `Logger.info` and
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

Now we can replace both `Logger.info` and `Logger.error` with:

```js
Logger.prototype.info = function() {
  this.logger.info.apply(this.logger, addPrefix.apply(null, arguments));
};

Logger.prototype.error = function() {
  this.logger.error.apply(this.logger, addPrefix.apply(null, arguments));
};
```

Note that because the functions differ only in which `this.logger` function
gets applied, we don't _need_ to copy and update more than the first test. We
could copy the other one, but given that the bulk of the implementation is
shared with `Logger.info` via `addPrefix`, it'd be of dubious value.

## Retrofitting `Logger` into `Config`

In production, the script will read the configuration from either
`config/slack-github-issues.json` in the current directory or from the file
specified by the `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` environment variable.
It would be good to log whichever file from which the program reads its
configuration. To that end, let's pass in an instance of `Logger` into the
`Config` constructor:

```js
function Config(configuration, logger) {
  var config = configuration ||
        parseConfigFromEnvironmentVariablePathOrUseDefault(logger);
```

Thanks to this conditional, in most of our tests, we'll conveniently ignore
this this `logger` variable. Now to update the other function:

```js
function parseConfigFromEnvironmentVariablePathOrUseDefault(logger) {
  var configPath = (process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH ||
      'config/slack-github-issues.json'),
    errorPrefix = 'failed to load configuration from ' + configPath + ': ';
  logger.info(null, 'reading configuration from', configPath); 

  // ...the try...catch block...
}
```

So now, in `exercise/test/config-test.js`, we need to add:

```js
var Logger = require('../lib/logger');
```

as well as:

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

Notice that we're not actually exercising the `logger.info` logic; we've
already done that in the `Logger` tests. We're using a sinon stub to ensure
that `logger.info` is called as we expect, however.

Now update the `should load from config/slack-github-issues.json by default`
test:

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
[we want to allow it to propagate so the `Config` object never
exists]({{ site.baseurl }}/concepts/valid-by-contract/). The code calling the
`Config` constructor can (and should!) catch and log the error.

Run `npm test -- --grep '^Config '` to ensure that the tests continue to pass.
Feel free to change something around to make them break, to make sure they're
testing what we intend them to test.

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

Now that you're all finished, compare your solutions to the code in
[`solutions/04-logger/lib/logger.js`]({{ site.baseurl }}/solutions/04-logger/lib/logger.js)
and
[`solutions/04-logger/test/logger-test.js`]({{ site.baseurl }}/solutions/04-logger/test/logger-test.js).

At this point, you may wish to `git commit` your work to your local repo.
After doing so, try copying the `logger.js` file from
`solutions/04-logger/lib` into `exercises/lib` to see if it passes the test
you wrote. Then run `git reset --hard HEAD` and copy the test files instead to
see if your implementation passes. If a test case fails, review the section of
this chapter pertaining to the failing test case, then try to update your code
to make the test pass.
