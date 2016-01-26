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
- capture the process's standard output to validate both success and error log
  messages
- writing small test harness functions to exercise and validate success and
  error cases
- use a couple of nifty ECMAScript 6 features that we've avoided using in the
  application code up until now

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

## Starting to write and run the `exercise/test/hubot-smoke-test` script

Open up a new file, `exercise/test/hubot-smoke-test`, and add this preamble:

```js
#! /usr/bin/env node

// jshint node: true
// jshint esversion: 6
//
// Ensures that Hubot can successfully load and register this application.
// 
// Usage:
//   cd path/to/hubot-slack-github-issues
//   npm run smoke-test -s

'use strict';
```

The first line, or "[shebang](https://en.wikipedia.org/wiki/Shebang_(Unix))",
is a UNIX convention identifying the executable to use when running the script
as a standalone program. If the script file has [execute
permission](https://en.wikipedia.org/wiki/File_system_permissions#Permissions),
the kernel will automatically use the specified executable to run the script.
[`/usr/bin/env node` is one of the more portable methods of specifying the
interpreter](https://en.wikipedia.org/wiki/Shebang_(Unix)#Portability), though
it isn't perfect.

Of course, this won't work on Windows and possibly other systems that aren't
UNIX-based. Also, unless the `node_modules/.bin` directory from your clone of this repository is already in your `PATH`, the script won't work on UNIX, either.

Not to fret! Since we'll only ever execute this script within this source
repository, we've defined a custom [npm
script](https://docs.npmjs.com/files/package.json#scripts), run via [`npm
run-script` (`npm run` for short)](https://docs.npmjs.com/cli/run-script). In
the top-level `package.json` file you'll find within the `scripts` object:

```json
    "smoke-test": "node exercise/test/hubot-smoke-test",
```

So now running the script via `npm run smoke-test` should successfully do
nothing:

```sh
$ npm run smoke-test

> 18f-unit-testing-node@0.0.0 smoke-test .../unit-testing-node
> node exercise/test/hubot-smoke-test

```

Now for kicks, add this line to the script:

```js
process.exit(1);
```

Running `npm run smoke-test` again should produce output resembling:

```sh
$ npm run smoke-test

> 18f-unit-testing-node@0.0.0 smoke-test .../unit-testing-node
> node exercise/test/hubot-smoke-test


npm ERR! OS VERSION
npm ERR! argv ".../bin/node" ".../bin/npm" "run" "smoke-test"
npm ERR! node NODE_VERSION
npm ERR! npm  NPM_VERSION
npm ERR! code ELIFECYCLE
npm ERR! 18f-unit-testing-node@0.0.0 smoke-test: `node exercise/test/hubot-smoke-test`
npm ERR! Exit status 1
npm ERR!
npm ERR! Failed at the 18f-unit-testing-node@0.0.0 smoke-test script 'node exercise/test/hubot-smoke-test'.
npm ERR! Make sure you have the latest version of node.js and npm installed.
npm ERR! If you do, this is most likely a problem with the 18f-unit-testing-node package,
npm ERR! not with npm itself.
npm ERR! Tell the author that this fails on your system:
npm ERR!     node exercise/test/hubot-smoke-test
npm ERR! You can get information on how to open an issue for this project with:
npm ERR!     npm bugs 18f-unit-testing-node
npm ERR! Or if that isn't available, you can get their info via:
npm ERR!     npm owner ls 18f-unit-testing-node
npm ERR! There is likely additional logging output above.

npm ERR! Please include the following file with any support request:
npm ERR!     .../unit-testing-node/npm-debug.log
```

Ugh! Why so noisy? Unlike [`npm test`](https://docs.npmjs.com/cli/test), which
suppresses such output because tests are frequently expected to fail, `npm`
reports as much context as possible for other failed scripts. But this _is_ a
test; how can we avoid this noise every time the test fails?

The solution, per the advice in the `Usage:` comment, is to use [the `-s` flag,
short for `--loglevel silent`](https://docs.npmjs.com/misc/config). Run the
script again, and the noisy output should go away. Then remove the
`process.exit(1)` line before continuing.

## Why `hubot-smoke-test` doesn't end in `.js`

Since the `hubot-smoke-test` will become a relatively high level and slow
running program, with verbose output, it's not something we will want to run
frequently. It also will not use the Mocha framework used in all of our other
tests. Consequently, we want it to be a standalone script that is invoked only
occasionally, not automatically with every 
