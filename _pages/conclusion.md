---
title: Conclusion
---
We hope you've enjoyed this end-to-end automated testing tutorial. You've
been exposed to a lot of information, ideas, and techniques, and it will take
time to assimilate and master them all. Still, your journey has begun, and you
are welcome to dip back into this tutorial as often as needed to refresh your
memory and practice until perfect.

## The real world

Of course, working through the guided examples in a tutorial bears little
resemblance to the scattered and dirty processes that software development
often requires. This exercise came about _after_ the [settlement
phase]({{ site.baseurl }}/concepts/exploration-vision-and-settlement/) of the
original program. Only in hindsight is it possible to outline the development
process in a linear fashion. In reality, [the initial outline of the entire
application](https://github.com/18F/hubot-slack-github-issues/tree/work-in-progress)
emerged first. This guided the development of the individual parts, which were
tested at every step.

## Forking npm packages to add `reaction_added` support

The core feature of the application is processing `reaction_added` messages.
However, at the time we wrote the first version of the application, neither
the slack-client nor the hubot-slack packages supported this message type.
Fortunately, since both are open source and published on GitHub, we could work
around the problem by forking the packages and adding rudimentary
`reaction_added` support.

See the
[forking and contributing upstream]({{ site.baseurl }}/concepts/forking-and-contributing-upstream)
chapter for all of the details.

## Unexpected API

Once the initial version was launched, new insights prompted significant
changes to parts of the program. For starters, the structure of the
[`reaction_added` message](https://api.slack.com/events/reaction_added)
differed from that initially suggested by the API documentation. Specifically,
the event did not contain the full message item, reactions and all. This
required a change to make a separate call to
[`reactions.get`](https://api.slack.com/methods/reactions.get).

This prompted a series of pull requests to add API support to the
`SlackClient` object. After that, [we carefully refactored the existing code
to use the correct message format via series of commits that kept the tests
passing](https://github.com/18F/hubot-slack-github-issues/compare/a083dad652dc9894f8e9804bc7c90fdd5deb8d76...ebb984c2c1233ec388af93c91723480ccc35f243).

This is where the true value of automated testing really becomes apparent.
Despite the radical changes required, good test support enabled us to proceed
with the confidence that all affected parts of the code were accounted for.
