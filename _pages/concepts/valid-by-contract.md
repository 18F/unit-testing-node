---
title: Ensuring valid objects by contract
---
In the [`Config` class chapter]({{ site.baseurl }}/components/config/), you
learned that if `validate` throws an `Error`, the `Config` constructor never
completes. Therefore, any time the `Config` constructor _doesn't_ throw an
`Error`, you can be sure that `Config` contains valid data by contract.
(Whether or not that contract is complete enough is a different question,
based on the semantics of the class.)

You must also be careful not to call any methods on `this` or assign any
properties to `this` until `validate` is successful. These are good habits to
get into across languages, both because they make it easier to reason about
object construction and they help you avoid potential security issues. The
[SEI CERT Coding Standards](https://www.securecoding.cert.org/confluence/display/seccode/SEI+CERT+Coding+Standards)
contain advice for various languages (not JavaScript yet, sadly) regarding
constructing objects in this fashion.

If your team's coding standards preclude throwing `Errors` from constructors,
or from throwing `Errors` at all, you can approximate this behavior with an
`init` function.
