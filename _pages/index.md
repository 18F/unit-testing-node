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

## Assumptions

This exercise assumes you are comfortable executing commands in a UNIX
environment. Specifically, it expects that you are familiar with the basics of
how to create directories and files on the command line of a terminal program.

This exercise also assumes that you have already installed Node.js version 4.2
or greater. See the [JavaScript section of our Development Environment
Standardization
Guide](https://pages.18f.gov/dev-environment-standardization/javascript/) for
instructions on how to set up a Node.js development environment.

## Tools

The tests will use:

- the [Mocha test framework](https://mochajs.org/)
- the [Chai assertion library](http://chaijs.com/), specifically the [Chai
  Behavior-Driven Development style assertions](http://chaijs.com/api/bdd/).
- the [Sinon spy, stub, and mock object library](http://sinonjs.org/)

Also, the code will make use of the [Promise
type](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise),
standard in JavaScript/ECMAScript 6 and Node.js versions 0.12.7 and up.
Promises are the standard way to write asynchronous operations. This exercise
will try to introduce you to their effective use (and to avoid some of the
pitfalls!).
