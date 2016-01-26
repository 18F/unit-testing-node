---
title: Dependency injection
---
Dependency injection is a fancy term for passing an object's dependencies as
arguments to its constructor. This is in contrast to hardcoding dependencies
directly into object, and is closely related to
[object composition]({{ site.baseurl }}/concepts/object-composition-vs-inheritance/).

The core idea is that wherever we introduce a
[seam]({{ site.baseurl }}/concepts/seams/), we are able to test each object on
either side of the seam in isolation, enabling tests for each object to be
easy to set up, easy to understand, fast to run, and exhaustive in their
coverage of the code under test. This is because seams are the mechanism
underpinning the dependency injection pattern, whereby one object may use
different object implementations that conform to the same interface.

When using a class in a production context, it will use other production
classes. When using it in a testing context, it may use stripped-down
implementations of its collaborators that make testing faster, easier, more
controllable, and more focused, without the complexity and overhead associated
with production implementations.  

That's not to say there isn't a need for automated tests that make use of
actual production objects; several chapters of this exercise do this. However,
it's much easier to write such tests when each component of an application has
already been tested thoroughly in isolation, rather than the other way around.
