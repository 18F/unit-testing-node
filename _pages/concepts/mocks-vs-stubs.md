---
title: Mocks vs. stubs
---
You may have heard of mock objects before, in either a positive or negative
light. At a high level, both are a form of [test
double](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html)
that stand in for production dependencies. The primary criticism of mocks are
that they bind the test too closely to implementation details of the code
under test. In other words, slight changes to the code under test may require
a disproportionate number of changes to the tests themselves.

Stubs, on the other hand, can be programmed to receive calls and return data
without relying as strictly on the implementation. The [`sinon`
library](http://sinonjs.org/) also makes it just as easy to create robust
"spies" and "stubs" as mock objects. For that reason, we favor stubs over
mocks in this tutorial. 

For one of the canonical treatises on the differences between "classical"
(i.e. stub-based) and "mockist" testing, read [Martin Fowler's "Mocks Aren't
Stubs"](http://martinfowler.com/articles/mocksArentStubs.html).
