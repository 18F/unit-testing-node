---
title: Code reuse
---
[Object composition]({{ site.baseurl }}/concepts/object-composition-vs-inheritance/)
leads to easily reusable objects. This leads to more robust, flexible,
maintainable, and testable systems. Because each object serves a specific
function, it may be freely reused by any number of other objects; this
eliminates the need for you to create numerous subclasses custom-tailored to
specific use cases.

When highly specific use cases do arise, you can use [software design
patterns](http://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented-ebook/dp/B000SEIBB8)
such as [Decorator](https://sourcemaking.com/design_patterns/decorator) and
[Adapter](https://sourcemaking.com/design_patterns/adapter) to enable a class
to be used in a new context, with either the same interface (Decorator) or a
different one (Adapter).

Fortunately for the use case in this tutorial, [the Node ecosystem has evolved
to strongly favor
composition](http://thenodeway.io/introduction/#choose-composition-over-inheritance),
thanks to an emphasis on [designing small modules to maximize flexibility and
reuse](http://thenodeway.io/introduction/#build-small-single-purpose-modules).
