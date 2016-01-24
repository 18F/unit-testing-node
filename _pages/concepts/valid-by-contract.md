---
title: Ensuring valid objects by contract
---
We learned from the [`Config` class
chapter]({{ site.baseurl }}/componets/config/) that if `validate` throws an
error, the `Config` constructor never completes. Therefore, any time the
`Config` constructor _doesn't_ throw an `Error`, we are guaranteed that
`Config` contains valid data by contract. (Whether or not that contract is
complete enough is a different question.)

We are also careful not to call any methods on `this` or assign any properties
to `this` until `validate is successful. These are good habits to get into
across languages, both to make it easier to reason about object construction
and to avoid potential security issues. The [SEI CERT Coding
Standards](https://www.securecoding.cert.org/confluence/display/seccode/SEI+CERT+Coding+Standards)
contain advice for various languages (not JavaScript yet, sadly) with regards
to constructing objects in this fashion.

If your team's coding standards preclude throwing errors from constructors, or
from throwing errors at all, you can approximate this behavior with an `init`
function.
