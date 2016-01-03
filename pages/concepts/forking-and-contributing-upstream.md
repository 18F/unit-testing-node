---
permalink: /concepts/forking-and-contributing-upstream/
parent: Concepts
title: Forking and contributing upstream
---
In the [`SlackClient` chapter]({{ site.baseurl }}/components/slack-client/),
we wrote the `makeApiCall` function to implement `getReactions` and
`addSuccessReaction`. As it turns out, the `Client` object from the
slack-client package already has a
[`_apiCall` method](https://github.com/slackhq/node-slack-client/blob/1.4.1/src/client.coffee#L534-L565).
Consequently, our implementation of `getReactions` and `addSuccessReaction`
could have made use of this method, instead of writing `makeApiCall` from
scratch.

However, the `_` prefix indicates that `_apiCall` is a private method, and as
such we should not depend on it directly. Instead, we should rely upon `Message`
methods such as
[`updateMessage` and `deleteMessage`](https://github.com/slackhq/node-slack-client/blob/1.4.1/src/message.coffee#L60-L82)
that use `_apiCall` in their implementation. Or, more to the point, we could
have tried to contribute new `getReactions` and `addReaction` methods upstream
to the slack-client package.

Also, neither package had support for `reaction_added` events, the processing
of which is the application's core feature. Comments on
[slackhq/node-slack-client#59](https://github.com/slackhq/node-slack-client/pulls/59)
suggested that a major rewrite was underway which would include
`reaction_added` support, but the release date was not specified. There was
also no mention of when the hubot-slack package would integrate the updated
slack-client.

**While contributing upstream is often the right thing to do, we often need to
balance that with getting our own projects across the finish line.** Many
programs depend upon slack-client, and waiting for Slack to publish an update
that serves our use case and everybody else's might've taken too long.
Thankfully, since the
[slack-client](https://github.com/slackhq/node-slack-client/) and
[hubot-slack](https://github.com/slackhq/hubot-slack/) packages are both
open-source and published on GitHub, there was a workable middle-path.

First we solicited the Slack team for feedback by opening
[18F/hubot-slack-github-issues#10](https://github.com/18F/hubot-slack-github-issues/issues/10)
and tagging the lead developer of the slack-client package. This was to see if
forking the packages made sense, or if support was coming so soon that waiting
would be worth it. After getting a positive response from the Slack developer,
we created the
[18F/node-slack-client#1.5.0-handle-reaction-added](https://github.com/18F/node-slack-client/tree/1.5.0-handle-reaction-added)
and
[18F/slack-hubot#3.4.2-handle-reaction-added](https://github.com/18F/hubot-slack/tree/3.4.2-handle-reaction-added)
forks and tags to add the support we needed. We updated the
[18F/18f-bot `package.json` file](https://github.com/18F/18f-bot/pull/40) to
point to our forked hubot-slack, which in turn [depends on our forked
slack-client](https://github.com/18F/hubot-slack/blob/3.4.2-handle-reaction-added/package.json#L25). Finally, we opened
[slackhq/node-slack-client#96](https://github.com/slackhq/node-slack-client/pull/96)
and
[slackhq/hubot-slack#271](https://github.com/slackhq/hubot-slack/pull/271)
after successfully deploying the application with these changes, to at least
offer them for upstream integration.

If we ever do switch to methods added to the official packages, the only
production code that will need to change is the `SlackClient` module. The
`SlackClient` test using the local test server will need to be modified, and
we may use a test double for `SlackClient` in other tests. However, all of the
test assertions should remain the same, verifying the behavior remains as
expected.

At worst, we'll have to keep our forked packages around for a while. At best,
upstream support will make most of our current implementation obsolete,
shrinking the amount of code we're responsible for maintaining. But regardless
of the future, we have a working application today, thanks to the opportunity
and power provided by open source and APIs.
