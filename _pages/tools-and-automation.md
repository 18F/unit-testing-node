---
title: Tools and automation
---
Now that we have a full application with a thorough test suite, let's discuss
how to apply tools and systems to keep it in shape.

## Continuous integration

Continuous integration (CI) systems watch for new changes committed to a code
repository, then build the code and run the tests to ensure the code remains
in a good state. Any build breakage or test failure produces notifications so
that developers can take steps to remedy the breakage before further changes
are committed.

Of course, the value of a continuous build instance is directly proportional
to the quality of the tests and the amount of coverage. Tests that are often
broken train developers to ignore failure notifications. Low coverage levels
provide low levels of confidence that passing builds are actually
release-worthy.

There are many continuous integration systems available to suit various needs.
Many of them, including those listed below, can be configured to run builds
for multiple different operating systems in parallel. Here are but a few
(note that this listing does not imply an endorsement of any particular
system):

- [Travis CI](https://travis-ci.org/): extremely popular CI service for Open
  Source projects hosted on [GitHub](https://github.com/)
- [Jenkins](https://jenkins.io/): powerful and extensible CI system written in
  Java
- [Buildbot](https://buildbot.net/): another popular, extensible CI system
  written in Python; two prominent installations include the [Python
  programming language Buildbot](https://www.python.org/dev/buildbot/) and the
  [Chromium project
  Buildbot](https://www.chromium.org/developers/testing/chromium-build-infrastructure/tour-of-the-chromium-buildbot)

## Coverage

Coverage is, at a minimum, a percentage measure of how many lines of code are
exercised by a suite of automated tests. Some coverage tools can measure
branch coverage, or the percentage of conditional branches exercised by
automated tests.

There are coverage tools available for practically every major programming
language that developers can run prior to committing code. For example,
[Istanbul](https://www.npmjs.com/package/istanbul) is a popular tool for
Node.js, and the [Go programming language distribution added support for
coverage metrics in version 1.2](https://blog.golang.org/cover).

There are also platforms that provide coverage statistics for Open Source
projects hosted on GitHub, such as:

- [Coveralls](https://coveralls.io/)
- [Code Climate](https://codeclimate.com/)

## Static analysis and style checkers

Static analysis and style checking tools analyze source code _without_
executing it to detect potentially problematic and dangerous language usage.
There are many bugs which both static analysis and automated testing could
both catch—and in most cases redundant checks can only help. In fact, some
static analysis warnings may highlight opportunities to refactor code and add
tests, such those for duplicated code, long functions or classes, or security
issues.

Here are some examples of static analysis and style checking tools for various
languages. The [Code Climate](https://codeclimate.com/engines) and [Hound
CI](https://houndci.com/) platforms have many tools that you can apply using
GitHub commit hooks.

- JavaScript: [ESLint](http://eslint.org/); configured for this tutorial,
  which you can run via `npm run lint`
- Ruby: [RuboCop](http://rubocop.readthedocs.io/en/latest/)
- Python: [Pylint](https://www.pylint.org/)
- Go: [gofmt](https://golang.org/cmd/gofmt/) and [go
  vet](https://golang.org/cmd/vet/), which are part of the standard
  distribution; [golint](https://github.com/golang/lint); also see the [gofmt
  blog post](https://blog.golang.org/go-fmt-your-code)
