---
title: Testing system integration
---
At this point, we've exhaustively tested all of our application's behavior and
validated that all of the components work together as expected. All that's
left is to test that we can launch a Hubot process with our script installed,
and that startup behavior is as expected.

If you've skipped to this chapter, you can establish the starting state of the
`exercise/` files for this chapter by running:

```sh
$ ./go set-system
```

## What to expect

A full system test would require us to launch a Hubot instance that loads our
script and initiates a [Slack Real Time Messaging
API](https://api.slack.com/rtm) session. However, at the time of writing,
writing a Real Time Messaging API emulator would be a project in itself.
(_Hmm..._) Consequently, writing a fully automated system test is not
practical within a reasonable time frame.

That said, the coverage provided by the [integration
test]({{ site.baseurl }}/testing-component-integration/) should provide a
reasonable amount of confidence in the overall behavior of the application.
All we really need is a way to check that an actual Hubot process can
successfully load our script.

We will learn to:

- write a Node.js script to run a Hubot process as part of a "smoke test"
- examine the process's standard output to validate both success and error log
  messages
- writing a harness function to exercise and validate properties common to
  both success and error cases

## What to include in a smoke test

A "smoke test" is any test or test suite that runs reasonably quickly to
validate that the core behavior of an application is working. The idea comes
from turning on an engine or other machine to see whether it runs and whether
any smoke comes out of it. If it runs, and no smoke comes out, there may be
problems, but no _huge_ problems. If smoke does come out, something is
seriously, dangerously wrong.

Since our system test will not interact with any simulated Slack or GitHub
servers, we'll call it a smoke test because that's all it'll be. It'll check
that Hubot can load `exercise/scripts/slack-github-issues` and:

- read the default configuration, `exercise/config/slack-github-issues.json`,
  and successfully register the application;
- read the `exercise/test/helpers/test-config.json` configuration file when
  specified via the `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` environment
  variable and successfully register the application; and
- read the `exercise/test/helpers/test-config-invalid.json` configuration file
  specified via the `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` environment
  variable and fail to register the application due to a configuration
  validation error.

## Starting to write `exercise/test/smoke-test.js`

Open up a new file, `exercise/test/smoke-test.js`, and add this preamble:

```js
'use strict';

var exec = require('child_process').exec;
var path = require('path');
var chai = require('chai');
var expect = chai.expect;

var rootDir = path.dirname(__dirname);
var scriptName = require(path.join(rootDir, 'package.json')).name;
var SUCCESS_MESSAGE = scriptName + ': registered receiveMiddleware';
var FAILURE_MESSAGE = scriptName + ': receiveMiddleware registration failed: ';
```

Some of this should look very familar by now. However, notice that we're
pulling in the [`exec` function from the `child_process` standard library
package](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback).
As you may expect, this is what we will use to execute our Hubot instance.
Plus, since `npm test` adds the `node_modules/.bin` directory from the
repository to the `PATH` environment variable, invoking the `hubot` program
will be straightforward.

We use `rootDir` to build up the constants used to match log messages. We
will also use `rootDir` to set the working directory of the `hubot` process
because `hubot` expects there to be a `scripts` directory present. Otherwise,
when we invoke `npm test`, the working directory will not necessarily be the
same as `rootDir`, causing a test failure.

In fact, let's try an experiment. Try running the following commands:
 
```sh
$ PATH=$PATH:node_modules/.bin hubot -t
OK

$ cd exercise
$ PATH=$PATH:../node_modules/.bin hubot -t
[Mon Jan 25 2016 20:34:50 GMT-0500 (EST)] INFO 18f-unit-testing-node: reading configuration from config/slack-github-issues.json
[Mon Jan 25 2016 20:34:50 GMT-0500 (EST)] INFO 18f-unit-testing-node: registered receiveMiddleware
OK

$ cd ..
```

The `-t` option tells hubot to only check that its configuration won't fail at
startup; otherwise `hubot` would start an interactive session.

As you can see, in the root directory of our repository, `hubot` didn't find
any scripts to load. In our `exercise` directory, however`, it found our
application and loaded it successfully. (Don't forget to `cd ..` to return to
the root directory of the repository!)

Note that we're using
[`path.join`](https://nodejs.org/api/path.html#path_path_join_path1_path2)
to ensure that `scriptName` is portable across operating systems.

Now let's add some empty test cases:

```js

describe('Smoke test', function() {
  it('should register successfully using the default config', function(done) {
  });

  it('should register successfully using the config from ' +
     'HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function(done) {
  });

  it('should fail to register due to an invalid config', function(done) {
  });
});
```

Notice that all of the test cases use a `done` callback. This is because
`exec` is asynchronous, and we'll need to pass to the `done` callback along to
it. In the end, this will make the test _easier_ to write than in we used
[`execSync`](https://nodejs.org/api/child_process.html#child_process_child_process_execsync_command_options)
instead.

## Working with `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH`

Since we know the `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` will figure
prominently in our test cases, let's add `beforeEach` and `after` hooks:

```js
describe('Smoke test', function() {
  beforeEach(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  after(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });
```

The `beforeEach` hook will make sure the variable is clear before each test
case. The `after` hook makes sure we clear the variable from the environment
once all our cases have finished to avoid affecting other tests suites.

Now let's set the environment variables for the cases that need it:

```js
  it('should register successfully using the config from ' +
     'HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function(done) {
    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      __dirname, 'helpers', 'test-config.json');
  });

  it('should fail to register due to an invalid config', function(done) {
    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      __dirname, 'helpers', 'test-config-invalid.json');
  });
```

Note that we're using
[`path.join`](https://nodejs.org/api/path.html#path_path_join_path1_path2)
to ensure that the config paths are portable across operating systems.

## Writing the `checkHubot` harness function

[Well-crafted repetition across test cases can be
helpful]({{ site.baseurl }}/concepts/repetition-in-tests/). However, multiple
assertions that are identical across test cases can cloud the differences
between the test cases. Encapsulating these common assertions in a new
function can help; the wrapper function can provide the repetition signalling
common expectations far more efficiently.

Combining this idea with the notion of a callback to `exec` that can validate
the result, and we can begin writing the `checkHubot` harness function:

```js
describe('Smoke test', function() {
  var checkHubot;

  // ...beforeEach and after hooks...

  checkHubot = function(done, validateOutput) {
    exec('hubot -t', { cwd: rootDir }, function(error, stdout, stderr) {
    });
  };
```

As mentioned earlier, `npm test` will set our `PATH` environment variable such
that `exec` can find our `hubot` installation. We pass the `-t` option so
`hubot` only checks its configuration and exits rather than starting an
interactive session. The working directory is set to `rootDir`, and
[`exec`](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback)
will pass the outputs of the finished process to the callback.

The `done` argument will be the `done` callback passed by Mocha into each test
fixture. `validateOutput` will be a callback defined by each test case to
validate the standard output string from the `hubot` process.

Let's fill in the structure of our callback to `exec`:

```js
    exec('hubot -t', { cwd: rootDir }, function(error, stdout, stderr) {
      try {
        validateOutput(stdout);
        done();

      } catch (err) {
        done(err);
      }
    });
```

That's the basic outline. However, we still need to add the common assertions
mentioned earlier. For every test case, we expect that:

- `hubot` will exit normally, meaning `error` should be `null`
- `hubot` will not print anything to standard error
- the last line of output should be "`OK`"

With that in mind, let's update the content of the `try` block to:

```js
        expect(error).to.be.null;
        stderr.should.eql('');
        validateOutput(stdout);
        stdout.should.have.string('\nOK\n', '"OK" missing from end of output');
        done();
```

## Finishing the test cases

With the `checkHubot` harness function in place, all that's left is to add it
to each test case. For the first two test cases, in which the script should
register successfully, add the following:

```js
    checkHubot(done, function(output) {
      output.should.have.string(SUCCESS_MESSAGE, 'script not registered');
    });
```

For the final test case, in which the script should fail to register, add:

```js
    checkHubot(done, function(output) {
      output.should.have.string(FAILURE_MESSAGE + 'Invalid configuration:',
        'script didn\'t emit expected error');
    });
```

And that's it! Really, that's all there is. Run the tests, and make sure they
pass. Change the assertions to make them break, just to be sure they're really
doing something.

## Check your work

By this point, all of the smoke tests should be passing:

```sh
$ npm test -- --grep '^Smoke test '

> 18f-unit-testing-node@0.0.0 test .../unit-testing-node
> gulp test "--grep" "^Smoke test "

[20:55:11] Using gulpfile .../unit-testing-node/gulpfile.js
[20:55:11] Starting 'test'...


  Smoke test
    ✓ should register successfully using the default config (638ms)
    ✓ should register successfully using the config from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH (642ms)
    ✓ should fail to register due to an invalid config (644ms)


  3 passing (2s)

[20:55:14] Finished 'test' after 2.5 s
```

Now that you're finished, compare your solutions to the code in
[`solutions/07-system/test/smoke-test.js`]({{ site.baseurl }}/solutions/07-system/test/smoke-test.js).

At this point, `git commit` your work to your local repo. After doing so, try
copying the `smoke-test.js` file from `solutions/07-system/test` into
`exercises/test` to see if your implementation passes. If a test case fails,
review the section of this chapter pertaining to the failing test case, then
try to update your code to make the test pass.
