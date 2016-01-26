---
title: Code reuse
---
[Object composition]({{ site.baseurl }}/concepts/object-composition-vs-inheritance/)
leads to more reusable objects. This leads to more robust, flexable,
maintainable, and testable systems. Since each object serves a specific
function, it may be freely reused by any number of other objects, rather than
producing a proliferation of subclasses custom-tailored to a specific use
case. When such specific cases arise, [software design
patterns](http://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented-ebook/dp/B000SEIBB8)
such as [Decorator](https://sourcemaking.com/design_patterns/decorator) and
[Adapter](https://sourcemaking.com/design_patterns/adapter) can allow a class
to be used in a new context, with either the same interface (Decorator) or a
different one (Adapter).

Fortunately for our use case, [the Node ecosystem has evolved to strongly favor
composition](http://thenodeway.io/introduction/#choose-composition-over-inheritance),
thanks to an emphasis on [designing small modules to maximize flexibility and
reuse](http://thenodeway.io/introduction/#build-small-single-purpose-modules).
