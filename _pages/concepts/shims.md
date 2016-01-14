---
permalink: /concepts/shims/
parent: Concepts
title: Shims
---
A "shim" is a very lightweight function, adapter or facade class. One
application is to standardize access to an object to avoid redundant arguments
at multiple call sites. For example, the [`Log` class]({{ site.baseurl
}}/components/log) from this exercise provides consistent `console.log`
parameters.

## Shims as a refactoring aid

Shims can also facilitate refactoring by allowing updates to some code before
updating the rest. An example is [the `getReactions()` function during the
refactoring of the actual hubot-slack-github-issues application to use the correct `reaction_added` message format](https://github.com/18F/hubot-slack-github-issues/compare/a083dad652dc9894f8e9804bc7c90fdd5deb8d76...ebb984c2c1233ec388af93c91723480ccc35f243).
[The `getReactions() shim to prepare for Slack API call`
commit](https://github.com/18F/hubot-slack-github-issues/commit/34cc84618ea6c1aaa2e1ddf712419cfb2976ec56)
introduced `getReactions()` to massage the incorrect message format into the
correct format. That commit also updated `Middleware.parseMetadata()` to use
the new, correct message format while requiring few changes to existing tests.

Several intermediate commits introduced other changes while the tests
continued to pass. Once the other requisite code changes were in place, [the
`Parse the correct response format in getReactions`
commit](https://github.com/18F/hubot-slack-github-issues/commit/dc05546cd2cfadaeb15a2468e0159b595fadd540)
updated `getReactions()` to use `SlackClient.getReactions()`. This eliminated
the need for the intermediate `messageWithReactions` object and also required
few changes to existing tests.
