---
permalink: /designing-the-application/
title: Designing the application
---
The server is based on a real-world application, [the Slack bot 18F uses to
open new GitHub issues](https://github.com/18F/hubot-slack-github-issues).
This application uses the [Hubot](https://www.npmjs.com/package/hubot)
framework and will act as a plugin for the [18F Slack bot
implementation](https://github.com/18F/18f-bot).  The high-level flow for the
application is:

- A team member adds an [emoji
  reaction](https://get.slack.help/hc/en-us/articles/206870317-Emoji-reactions)
  to a message in Slack.
- The bot receives a [`reaction_added` notification from the Slack Real Time
  Messaging API](https://api.slack.com/events/reaction_added).
- The event is matched against a set of configuration rules. If it matches a
  rule, the bot will [retrieve the list of
  reactions](https://api.slack.com/methods/reactions.get) for the message.
- Provided that the message has not already been processed, the plugin will
  [create a GitHub
  issue](https://developer.github.com/v3/issues/#create-an-issue) for the
  message based on the the rule. The issue will contain a link to the message.
- At this point, the plugin will [add a reaction to the
  message](https://api.slack.com/methods/reactions.add) with an emoji
  indicating success and post the issue URL to the channel in which the
  message appeared.
- If an error occurs while making API calls to Slack and GitHub, the bot will
  post the error message to the channel.

The core logic module will conform to the [Hubot receive middleware
specification](https://hubot.github.com/docs/scripting/#middleware). This
specification boils down to registering a function with the following
signature:

```js
function middleware(context, next, done) { }
```

The registration will follow roughly this pattern, where the core logic of our
application is contained by a class called `Middleware`:

```js
var Middleware = require('../lib/middleware.js');

module.exports = function(robot, configuration, githubApiClient) {
  var impl = new Middleware(),
      middleware = function(context, next, done) {
        impl.execute(context, next, done);
      };

  robot.receiveMiddleware(middleware);
}
```

In the above sample code, we see the first
[seam]({{ site.baseurl }}/concepts/seams/) of the application, between the
`robot.receiveMiddleware()` call and the `Middleware` class. This is the point
at which our application-specific logic plugs into the Hubot system.

## Testing strategy

Most of the tests we will write will not exercise the code at this level. We
will write a system integration test that makes sure that basic success and
failure cases propagate through the entire system as expected. However,
attempting to validate every success and failure case by running the entire
system would prove complicated, tedious, slow, and brittle, even for an
application as small as this.

Testing the `Middleware` class in isolation requires a less complex testing
setup that is easier to configure and control. We will also find seams within
the `Middleware` class itself, extract several other discrete components, and
test those thoroughly and independently from the `Middleware` class. We can
then use an integration test to validate that the `Middleware` class interacts
with these components as expected.

In the next chapter, we'll begin to think about how to compose the
`Middleware` class based on the functions outlined above.
