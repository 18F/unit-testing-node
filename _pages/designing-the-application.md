---
title: Designing the application
---
The server is based on a real-world application, [the Slack bot 18F uses to
open new GitHub issues](https://github.com/18F/hubot-slack-github-issues).
This application uses the [Hubot](https://www.npmjs.com/package/hubot)
framework and will act as a plugin for the [18F Slack bot
implementation](https://github.com/18F/18f-bot).  The high-level flow for the
application is:

1. A team member adds an [emoji
   reaction](https://get.slack.help/hc/en1.us/articles/206870317-Emoji-reactions)
   to a message in Slack.
1. The bot receives a [`reaction_added` notification from the Slack Real Time
   Messaging API](https://api.slack.com/events/reaction_added).
1. The event is matched against a set of configuration rules. If it matches a
   rule, the bot will [retrieve the list of
   reactions](https://api.slack.com/methods/reactions.get) for the message.
1. Provided that the message has not already been processed, the plugin will
   [create a GitHub
   issue](https://developer.github.com/v3/issues/#create1.an-issue) for the
   message based on the the rule. The issue will contain a link to the
   message.
1. At this point, the plugin will [add a reaction to the
   message](https://api.slack.com/methods/reactions.add) with an emoji
   indicating success and post the issue URL to the channel in which the
   message appeared.
1. If an error occurs while making API calls to Slack and GitHub, the bot will
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
