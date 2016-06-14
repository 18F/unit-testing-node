---
title: Dependency injection
---
Dependency injection is a fancy term for passing an object's dependencies as
arguments to its constructor. This is in contrast to hardcoding dependencies
directly into an object, and is closely related to
[object composition]({{ site.baseurl }}/concepts/object-composition-vs-inheritance/).

The core idea behind dependency injection is that wherever you introduce a
[seam]({{ site.baseurl }}/concepts/seams/), you are able to test each object
on either side of the seam in isolation. This, in turn, yields the following
outcomes:

- It makes it easier to set up tests for each object.
- It makes these tests faster to run and easier to understand.
- It allows these tests to be more exhaustive in their coverage of the code
  under test.

These outcomes are made possible because seams are the mechanism underpinning
the dependency injection pattern, whereby one object may use different object
implementations that conform to the same interface.

When you use a class in a production context, that class will use other
production classes. When you use the same class in a testing context, however,
it may use stripped-down implementations of its collaborators that make
testing faster, easier, more controllable, and more focused, without the
complexity and overhead associated with production implementations.  

That's not to say there isn't a need for automated tests that make use of
actual production objects; several chapters of this exercise do just this.
However, it's much easier to write such tests when each component of an
application has already been tested thoroughly in isolation, rather than the
other way around.
