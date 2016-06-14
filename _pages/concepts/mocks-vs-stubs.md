---
title: Mocks vs. stubs
---
You may have heard of mock objects before (in either a positive or negative
light). At a high level, both are a form of [test
double](http://googletesting.blogspot.com/2013/07/testing-on-toilet-know-your-test-doubles.html)
that stand in for production dependencies. The primary criticism of mocks is
that they bind the test too closely to implementation details of the code
under test. In other words, slight changes to the code under test may require
a disproportionate number of changes to the tests themselves.

Stubs, on the other hand, can be programmed to receive calls and return data
without relying as strictly on the implementation. The [`sinon`
library](http://sinonjs.org/) makes it just as easy to create robust _spies_
and _stubs_ as mock objects. For that reason, this tutorial favors stubs over
mocks.

For one of the canonical treatises on the differences between _classical_
(i.e. stub-based) and _mockist_ testing, please read [Martin Fowler's "Mocks
Aren't Stubs."](http://martinfowler.com/articles/mocksArentStubs.html)
