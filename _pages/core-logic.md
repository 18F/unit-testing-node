---
title: Designing the core logic module
---
Given that our core logic involves interaction with both Slack and GitHub, we
will need a more complex object than a plain callback function.

### Functions

It will need to:

- configure the application with matcher rules and API parameters
- respond to Slack Real Time API events and match them against matcher rules
- translate the Slack data into a GitHub API request
- send a response via the Slack Real Time API indicating success or failure of
  the GitHub request

### Entities

There are four entities interacting here:

- the _internal_ configuration object
- the _external_ Slack service
- the _external_ GitHub service
- our _internal_ application logic sitting in between Slack and Github

### Object composition

Rather than writing a single object to do all four things, we will use
multiple objects responsible for each entity:

- a `Config` object to define the configuration schema and validate the
  configuration upon startup
- the [slack-client](https://www.npmjs.com/package/slack-client) object
  passed into `HandbookIssueBot` as `robot.adapter.client`
- a `GitHubClient` object that will compose the GitHub API request and use a
  [github-client](https://www.npmjs.com/package/github-client) object to send
  it
- a `Middleware` object that will manage the reaction message rule-matching
  and API request logic

In this way, we are able to build complex applications via the _composition_
of multiple distinct objects, rather than through complex webs of
_implementation inheritance_. Seams allow us to view objects as collaborating
with one another, rather than having behavior from one object melded into
another. The interaction between components remains explicit; developers need
not study object hierarchies to understand an object's actual behavior.

### Code reuse

Object composition also leads to more reusable objects. Since each object
serves a specific function, it may be freely reused by any number of other
objects, rather than producing a proliferation of subclasses custom-tailored
to a specific use case. When such specific cases arise,
[software design patterns](http://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented-ebook/dp/B000SEIBB8)
such as [Decorator](https://sourcemaking.com/design_patterns/decorator) and
[Adapter](https://sourcemaking.com/design_patterns/adapter) can allow a class
to be used in a new context, with either the same interface (Decorator) or a
different one (Adapter).

Fortunately for our use case, [the Node ecosystem has evolved to strongly favor
composition](http://thenodeway.io/introduction/#choose-composition-over-inheritance),
thanks to an emphasis on [designing small modules to maximize flexibility and
reuse](http://thenodeway.io/introduction/#build-small-single-purpose-modules).

### Testability

Adhering to object composition rather than implementation inheritance also
means that tests for each object can remain focused and relatively easy to
write. With implementation inheritance, you're often not only testing the
behavior of a subclass, but its parents, and its parents' parents, and so on.
This can lead to tests that are complex to set up, confusing to understand,
slow to run, and possibly flaky (i.e. it passes or fails inconsistently).

### Dependency injection

The core idea is that wherever we introduce a seam, we are able to test each
object on either side of the seam in isolation, enabling tests for each object
to be easy to set up, easy to understand, fast to run, and exhaustive in their
coverage of the code under test. This is because seams are the mechanism
underpinning the dependency injection pattern, whereby one object may use
different object implementations that conform to the same interface.

When using a class in a production context, it will use other production
classes. When using it in a testing context, it may use stripped-down
implementations of its collaborators that make testing faster, easier, more
controllable, and more focused, without the complexity and overhead associated
with production implementations.  

That's not to say there isn't a need for automated tests that make use of
actual production objects; we'll consider when and how to do this in a later
chapter. However, it's much easier to write such tests when each component of
an application has already been tested thoroughly in isolation, rather than
the other way around.


