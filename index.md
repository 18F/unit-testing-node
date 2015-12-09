---
permalink: /
title: Introduction
---
This exercise will walk you through writing a small
[Node.js](https://nodejs.org/) application and writing unit tests for it. You
will learn how to:

- structure your code to separate concerns effectively, which maximizes
  readability, maintainability, and testability
- write small, focused tests for your application-specific logic
- use a technique known as "dependency injection" to simulate interaction with
  a remote service
- write an automated integration test for your application

The tests will use:

- the [Mocha test framework](https://mochajs.org/)
- the [Chai assertion library](http://chaijs.com/), specifically the [Chai
  Behavior-Driven Development style assertions](http://chaijs.com/api/bdd/).
- the [Sinon spy, stub, and mock object library](http://sinonjs.org/)

Also, the code will make use of the [Promise
type](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise),
standard in JavaScript/ECMAScript 6 and Node.js versions 0.12.7 and up.
Promises are the standard way to write asynchronous operations, and this
exercise will try to introduce you to their effective use in the process (and
to avoid some of the pitfalls!).

## Assumptions

This exercise assumes you are comfortable executing commands in a UNIX
environment. Specifically, it expects that you are familiar with the basics of
how to create directories and files on the command line of a terminal program.

This exercise also assumes that you have already installed the latest version
of Node.js to your machine, which is 5.1.0 at the time of writing. See the
[JavaScript section of our Development Environment Standardization
Guide](https://pages.18f.gov/dev-environment-standardization/javascript/) for
instructions on how to set up a Node.js development environment.

## Further reading

Before or after reading this guide, read our [Automated Testing
Playbook](https://pages.18f.gov/automated-testing-playbook) for more context,
or the [Testing Cookbook](https://pages.18f.gov/testing-cookbook/) for more
details about the automated testing tools and techniques available for
different languages.

Several of the posts at [The Node Way](http://thenodeway.io/) also strongly
influenced the design of this guide's application, specifically:

- [Understanding Error-First
  Callbacks](http://thenodeway.io/posts/understanding-error-first-callbacks/)
- [Testing Essentials](http://thenodeway.io/posts/testing-essentials/)
- [Designing Custom Types](http://thenodeway.io/posts/designing-custom-types/)
