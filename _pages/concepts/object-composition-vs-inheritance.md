---
title: Object composition vs. inheritance
---
There are two common models of
[code reuse]({{ site.baseurl }}/concepts/code-reuse/):

- **Composition**: code is packaged into discrete units and used as members of
  unrelated objects
- **Implementation inheritance**: code from parent classes is made available
  to child objects

_Note:_ Cut-and-paste is not a viable code reuse strategy, demonstrated by
[the `goto fail` bug](http://martinfowler.com/articles/testing-culture.html).

Implementation inheritance almost always is a path to ruin, thanks to the
tight coupling between classes that share implementation in this way:

- A parent class must be careful not to break a child class's behavior.
- A child class must remain aware of the implementation details of its parent.
- Both of these prior dependencies are largely invisible upon a casual reading
  of the code.
- Testing a child class is greatly complicated by the setup requirements of
  its parent classes and their dependencies.

All of these add up to systems that are difficult to comprehend, update,
maintain, fix, and especially test. Testing a system of highly-coupled classes
is often complicated, slow, and flaky, which makes testing seem like more of
an overhead than a valuable practice. Developers then live in fear that their
changes will produce unintended side effects, rather than proceeding with
confidence that their test suite will catch them. As a result, changes become
slower, more complicated, and more expensive to make, as well as more likely
to cause bugs.

By contrast, with object composition:

- A class composed of other objects does not need to worry about breaking the
  behavior of those other objects.
- A class used to compose other objects does not require special knowledge of
  any class in which it's embedded.
- The relationship between a class and any objects it's composed of is obvious
  upon a casual reading of the code.
- Testing both the outer and inner classes is greatly simplified given that
  their setup requirements and dependencies are separate from one another.

## What about interface inheritance?

Interface inheritance, whereby a child object only inherits the method
signatures of its parents (and _not_ its implementation) is actually an
excellent practice. In statically typed languages that support it, interface
inheritance is the mechanism that makes
[dependency injection]({{ site.baseurl }}/concepts/dependency-injection/)
possible. Liberal use of interface inheritance helps define the
[seams]({{ site.baseurl }}/concepts/seams/) between application components.

Many languages enable polymorphic behavior, which is a fancy way of saying you
can change a program's behavior by swapping one object for another. (Computer
science fans will also recognize this as an informal summary of the
[Liskov substitution principle (LSP)](https://en.wikipedia.org/wiki/Liskov_substitution_principle).)
Not all of them rely on interface inheritance. Dynamic languages such as
Node.js, Ruby, and Python check method calls at runtime. Go, an up-and-coming
statically typed systems language, also dispenses with _both_ forms of
inheritance, through its
[embedding](https://golang.org/doc/effective_go.html#embedding)
and [interface](https://golang.org/doc/effective_go.html#interfaces_and_types)
mechanisms.
