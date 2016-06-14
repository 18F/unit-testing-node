---
title: Testability
---
The same principles and techniques that make code easier to test often make it
easier to read, maintain, refactor, and extend in general. At the same time,
writing [highly cohesive, loosely
coupled](https://thebojan.ninja/2015/04/08/high-cohesion-loose-coupling/)
modules that make code easier to read and work with often make it easier to
test. Consequently, writing testable code is equivalent to writing good,
modular code for its own sake.

Specifically, [preferring object composition to implementation
inheritance]({{ site.baseurl }}/concepts/object-composition-vs-inheritance/)
enables tests for each object to remain focused and relatively easy to write.
By contrast, with implementation inheritance, you're often not only testing
the behavior of a subclass, but also of its parents, its parents' parents, and
so on. This tight coupling of behaviors can lead to tests that are complex to
set up, confusing to understand, slow to run, and possibly flaky (i.e. when a
test passes or fails inconsistently due to uncontrolled inputs).
