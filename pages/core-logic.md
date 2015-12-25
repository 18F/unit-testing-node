---
permalink: /core-logic/
title: Designing the core logic module
---
Given that our core logic involves managing interactions between Hubot, Slack
and GitHub, we will need a more complex object than a plain callback function.

### Functions

The specific functions required by the application flow are:

- **configure** the application with rules and API parameters
- **listen** for `reaction_added` events from the **Slack API** via **Hubot**
- **match** events against the rules
- **fetch** the reactions to a message using the **Slack API**
- **create** an issue for a message using the **GitHub API**
- **add** a reaction to a message using the **Slack API**
- **log** the action taken for matching events

### Entities

There are six entities interacting, four **internal** and two **external**:

- the **internal** configuration object
- the **internal** rule objects comprising part of the configuration
- the **external** Slack service
- the **external** GitHub service
- the **internal** logging mechanism
- the **internal** application logic sitting between Hubot, Slack and Github

### Object composition

Rather than writing a single object to do all six things, we will use
multiple objects responsible for each entity:

- a `Config` object to define the configuration schema and validate the
  configuration upon startup
- a `Rule` object to encapsulate the matching behavior
- a `SlackClient` object to encapsulate the
  [slack-client](https://www.npmjs.com/package/slack-client) object
  passed into the application as `robot.adapter.client` and the
  Slack Web API requests
- a `GitHubClient` object that will handle the GitHub API requests
- a `Log` object that will provide a thin abstraction over `console.log`
- a `Middleware` object composed of all of the above objects to manage the
  flow of event matching and API requests

In this way, we are able to build the complete application via the
_composition_ of multiple distinct objects. This makes it easier to test each
individual application function thoroughly, while making the overall structure
and flow of the application easier to understand.

### Where to begin?

There is no one right place to start. For the sake of the exercise, we will
begin with the `Config` class. It is straightforward to test yet provides
insight into the rest of the program.

In your own programs, however, feel free to start at whichever point seems
most clear to you. Bear in mind that this exercise was written well after the
[settlement phase]({{ site.baseurl }}/concepts/exploration-vision-and-settlement/)
of the original program.

That said, each component was developed with tests at every step, after [the
initial outline of the entire application was sketched
out](https://github.com/18F/hubot-slack-github-issues/tree/work-in-progress).
