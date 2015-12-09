---
permalink: /designing-the-application/
title: Designing the application
---
The server is based on a real-world application, [the Slack bot 18F uses to
open new GitHub issues](). This application uses the
[Hubot](https://www.npmjs.com/package/hubot) framework and will act as a
plugin for the [18F Slack bot implementation](https://github.com/18F/18f-bot). 
The high-level flow for the application is:

- receive a [`reaction_added` notification from the Slack Real Time Messaging
  API](https://api.slack.com/events/reaction_added)
- parse the notification and issue an HTTP request [to create an issue using
  the GitHub API](https://developer.github.com/v3/issues/#create-an-issue)
- report success or failure via the Slack bot response mechanism

Our core logic module will conform to the [Hubot middleware
specification](https://hubot.github.com/docs/scripting/#middleware). This
specification boils down to registering a function with the following
signature:

```js
function middleware(context, next, done) { }
```

The registration will follow roughly this pattern:

```js
var Middleware = require('../lib/middleware.js');
module.exports = function(robot, configuration, githubApiClient) {
  robot.receiveMiddleware(Middleware);
}
```

### Seams

To help us think of how to separate the concerns between different parts of
the application, we will use the term "seam". Just as complex objects in the
real world are composed of disparate parts joined at some kind of seam, so
are the objects that will compose our application. A seam represents a
boundary between objects, where one object will interact with another object
using the latter object's interface (i.e. methods and exposed member
variables).

### Splitting the bot registration logic from the core logic

In the above sample code, we see the first seam of the application is between
the bot registration call and the core logic. This is because the bot
registration layer is at a higher level, and requires a relatively complex
setup to exercise in a test. At the same time, the bot registration layer is
pretty generic: it accepts callback functions and routes notification
messages to registered callbacks, then reports success or failure. Validating
every detail of specific success and failure cases is not necessary to ensure
that success and failure cases in general are propagated through the
application. Therefore, by introducing this seam, far fewer and far less
complex tests will be required to exercise the bot registration layer
functionality.

On the other side of the seam, the core application logic (parsing
notification messages and issuing GitHub API requests) is more complex and
application-specific than the top-level behavior. At the same time, it
requires a less complex testing setup, as its inputs and outputs can be
exercised directly. (This holds for the GitHub API calls, too, as we will
see.)

In the next chapter, we'll start writing and testing our core application
logic class.
