---
title: Testing strategy
---
Most of the tests we will write will not exercise the code at the complete
application level. We will write a system integration test that makes sure
that basic success and failure cases propagate through the entire system as
expected. However, attempting to validate every success and failure case by
running the entire system would prove complicated, tedious, slow, and brittle,
even for an application as small as this.

Testing the `Middleware` class in isolation requires a less complex testing
setup that's easier to configure and control. We will also find
[seams]({{ site.baseurl }}/concepts/seams/) within the `Middleware` class
itself, extract several other discrete components, and test those thoroughly
and independently from the `Middleware` class. We can then use an integration
test to validate that the `Middleware` class interacts with these components
as expected.

In the next chapter, we'll begin to think about how to compose the
`Middleware` class based on the functions outlined above.

## Test-first or test-with?

This narrative doesn't follow a strict test-first style often associated with
[Test-Driven Development (TDD)](https://en.wikipedia.org/wiki/Test-driven_development).
However, reading the sections that begin with the word **Testing**, then
backtracking to read earlier sections may provide the same effect.

The important thing is that the code has tests _with_ it when it's sent for
review or checked into revision control. Whether you're more comfortable
writing the tests first, or writing some code and testing it immediately
after, is up to you.
