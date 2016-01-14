---
permalink: /testing-component-integration/
title: Testing component integration
---
If you've skipped to this chapter, you can establish the starting state of the
`exercise/` files for this chapter by running:

```sh
$ ./go set-integration
```

## What to expect

## Testing

## Check your work

By this point, all of the integration tests should be passing:

```sh
```

Now that you're all finished, compare your solutions to the code in
[`solutions/05-integration/lib/github-client.js`]({{ site.baseurl }}/solutions/05-integration/lib/github-client.js)
and
[`solutions/05-integration/test/github-client-test.js`]({{ site.baseurl }}/solutions/05-integration/test/github-client-test.js).

You may wish to `git commit` your work to your local repo at this point. After
doing so, try copying the `config.js` file from `solutions/05-integration`
into `exercises` to see if it passes the test you wrote. Then run `git reset
--hard HEAD` and copy the test files instead to see if your implementation
passes.
