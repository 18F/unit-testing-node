---
title: Forking and contributing upstream
---
As you wereworking through the [`SlackClient`
chapter]({{ site.baseurl }}/components/slack-client/),
you wrote the `makeApiCall` function to implement `getReactions` and
`addSuccessReaction`. As it turns out, the `Client` object from the
slack-client package already has a
[`_apiCall` method](https://github.com/slackhq/node-slack-client/blob/1.4.1/src/client.coffee#L534-L565).
Consequently, the implementation of `getReactions` and `addSuccessReaction`
could have made use of this method (which means you wouldn't have had to write
the `makeApiCall` from scratch).

However, the `_` prefix indicates that `_apiCall` is a private method, and, as
such, one you shouldn't depend on directly. Depending on private methods
breaks encapsulation by circumventing the published interface of a class,
which means your code may break if the private details change. Instead, you
should rely on `Message` methods such as [`updateMessage` and
`deleteMessage`](https://github.com/slackhq/node-slack-client/blob/1.4.1/src/message.coffee#L60-L82)
that use `_apiCall` in their implementation. Or, more to the point, you could
have tried to contribute new `getReactions` and `addReaction` methods upstream
to the slack-client package.

In addition, neither package had support for `reaction_added` events, the
processing of which is the application's core feature. Comments on
[slackhq/node-slack-client#59](https://github.com/slackhq/node-slack-client/pulls/59)
suggested that a major rewrite, which would include `reaction_added` support,
was underway, although the release date wasn't specified. There was no mention
of when the hubot-slack package would integrate the updated slack-client.

**While contributing upstream is often the right thing to do, you need to
balance it with getting your own projects across the finish line.** Many
programs depend upon slack-client, and waiting for Slack to publish an update
that serves this project's use case (and everybody else's) might've taken too
long. Thankfully, since the
[slack-client](https://github.com/slackhq/node-slack-client/) and
[hubot-slack](https://github.com/slackhq/hubot-slack/) packages are both
open-source and published on GitHub, there was a workable middle-path.

This is how the author originally addressed the situation:

First he solicited the Slack team for feedback by opening
[18F/hubot-slack-github-issues#10](https://github.com/18F/hubot-slack-github-issues/issues/10)
and tagging the lead developer of the slack-client package. This was to see if
forking the packages made sense, or if support was coming so soon that waiting
would be worth it. After getting a positive response from the Slack developer,
he created the
[18F/node-slack-client#1.5.0-handle-reaction-added](https://github.com/18F/node-slack-client/tree/1.5.0-handle-reaction-added)
and
[18F/slack-hubot#3.4.2-handle-reaction-added](https://github.com/18F/hubot-slack/tree/3.4.2-handle-reaction-added)
forks and tags to add the support he needed. He updated the
[18F/18f-bot `package.json` file](https://github.com/18F/18f-bot/pull/40) to
point to the forked 18F/hubot-slack repository, which in turn [depended on the
forked 18F/slack-client repository](https://github.com/18F/hubot-slack/blob/3.4.2-handle-reaction-added/package.json#L25).
Finally, he opened [slackhq/node-slack-client#96](https://github.com/slackhq/node-slack-client/pull/96)
and [slackhq/hubot-slack#271](https://github.com/slackhq/hubot-slack/pull/271)
after successfully deploying the application with these changes; this at least
made the changes available for upstream integration.

If the program ever does switch to methods added to the official packages, the only
production code that will need to change is the `SlackClient` module. The
`SlackClient` test using the local test server will require modification, and
a test double can stand in for `SlackClient` in other tests. However, all of
the test assertions should remain the same, verifying that the behavior
remains as expected.

When forking dependencies like this, at worst, you'll have to keep your forked
packages around for a while. At best, upstream support will make most of your
current implementation obsolete, shrinking the amount of code you're
responsible for maintaining. Regardless of the future, you will have a working
application today, thanks to the opportunity and power provided by open source
and APIs.
