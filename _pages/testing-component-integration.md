---
title: Testing component integration
---
Now that we've completed all of the application-specific components, and
implemented the core `Middleware` functionality, it's time to plug
`Middleware` into `Hubot`. We'll do this by creating the "script" that defines
the entry point of our application.

If you've skipped to this chapter, you can establish the starting state of the
`exercise/` files for this chapter by running:

```sh
$ ./go set-integration
```

## What to expect

Since we've exhaustively tested every corner of our application logic using
small, fast, isolated tests, we only need to validate a few high-level
integration cases. The setup will be a little more complex, and the test cases
may not run as fast, but we will not need nearly as many. Should any of these
tests fail, it may indicate a misunderstanding of the system boundary. This
misunderstanding may also signal a gap in our component level coverage that we
need to fill.

In short, we will learn to:

- integrate our application components to implement the [Hubot receive
  middleware](https://hubot.github.com/docs/scripting/#middleware) interface
- use the [hubot-test-helper](https://www.npmjs.com/package/hubot-test-helper)
  package to simulate user interaction
- launch a local HTTP test server to exercise components that access external
  APIs without actually depending on external services
- validate high-level success and error cases that exercise all the core
  application components rather than using test doubles for any of them

## Writing the main script

Open a new file called `exercise/scripts/slack-github-issues.js` Start it with
this preamble, with fields inspired by the [Hubot documentation
guidelines](https://hubot.github.com/docs/scripting/#documenting-scripts):

```js
// jshint node: true
//
// Description:
//   Uses the Slack Real Time Messaging API to file GitHub issues
//
// Configuration:
//   HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH

'use strict';
```

Now we'll add `require` statements for all of our application components
(except `Rule`, which is created directly by `Middleware`):

```js
var Config = require('../lib/config');
var SlackClient = require('../lib/slack-client');
var GitHubClient = require('../lib/github-client');
var Logger = require('../lib/logger');
var Middleware = require('../lib/middleware');
```

The basic interface required to plug into Hubot is a function that takes a
Hubot instance as its only argument. Let's wire our core application
components together and register the `Middleware`:

```js
module.exports = function(robot) {
  var config = new Config(),
      impl = new Middleware(
        config,
        new SlackClient(robot.adapter.client, config),
        new GitHubClient(config),
        new Logger(robot.logger));

  robot.receiveMiddleware(function(context, next, done) {
    impl.execute(context, next, done);
  });
  impl.logger.info('registered receiveMiddleware');
};
```

Recall that we are conforming to the [Hubot receive
middleware](https://hubot.github.com/docs/scripting/#middleware) interface,
which takes a function as its argument, not an object. This is why we create a
closure that contains the `impl` object.

## Testing

## Check your work

By this point, all of the integration tests should be passing:

```sh
```

Now that you're all finished, compare your solutions to the code in
[`solutions/05-integration/lib/github-client.js`]({{ site.baseurl }}/solutions/05-integration/lib/github-client.js)
and
[`solutions/05-integration/test/github-client-test.js`]({{ site.baseurl }}/solutions/05-integration/test/github-client-test.js).

You may wish to `git commit` your work to your local repo at this point. After
doing so, try copying the `config.js` file from `solutions/05-integration`
into `exercises` to see if it passes the test you wrote. Then run `git reset
--hard HEAD` and copy the test files instead to see if your implementation
passes.
