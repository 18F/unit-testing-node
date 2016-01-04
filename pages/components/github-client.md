---
permalink: /components/github-client/
parent: Designing and testing the components
title: GitHubClient class
---
The `GitHubClient` class encapsulates the application's dependency on the
[GitHub API](https://api.slack.com/). You can find it in the
['exercise/lib/github-client.js`]({{ site.baseurl }}/exercise/lib/github-client.js)
file.

If you don't have experience writing HTTP calls and launching test servers,
testing the `GitHubClient` class is a great way to gain some experience. If
you're looking for more of a challenge, then move on to the next chapter.
If you've skipped to this chapter, you can establish the starting state of the
`exercise/` files for this chapter by running:

```sh
$ ./go set-github-client
```

## What to expect

After receiving a `reaction_added` event and fetching the all the message
reactions via `SlackClient.getReactions`, we will use the [GitHub API to
create a new issue](https://developer.github.com/v3/issues/#create-an-issue).
Like `SlackClient`, this class is a [facade
class](https://sourcemaking.com/design_patterns/facade) that limits the
exposure of the GitHub API to our application's code.

To reiterate the advantages of a facade:

- All uses of the external dependency are documented via the methods on the
  facade.
- When the upstream interface changes, only this class should require any
  changes, minimizing the cost and risk of upgrades.
- We can use [dependency injection]({{ site.baseurl }}/concepts/dependency-injection/)
  in our tests _to model and control_ the external behavior.

GitHub API wrapper packages exist, but since this is the only API call our
application will make, we'll write our own code to [minimize
dependencies](/concepts/minimizing-dependencies/). Since the code required is
relatively small and straightforward, it also provides a good example of _how_
to write and test web API wrappers.

This class is actually a little smaller than `SlackClient`. However, whereas
`SlackClient` makes a GET request with all its information encoded in the
URL, `GitHubClient` makes a POST request that requires specific HTTP headers.
We will learn to:

- manage HTTP bookkeeping
- learn the basics of using a
  [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
  to encapsulate an asynchronous operation
- learn how to test HTTP requests by launching a local HTTP test server
- learn how to use Promises with mocha and chai

## Starting to build `GitHubClient`

The beginning of the `slack-client.js` file, where the `GitHubClient`
constructor is defined, looks like this:

```js
/* jshint node: true */

'use strict';

module.exports = GitHubClient;

function GitHubClient(config) {
  this.user = config.githubUser;
  this.timeout = config.githubTimeout;
  this.protocol = 'https:';
  this.host = 'api.github.com';
}

GitHubClient.prototype.fileNewIssue = function(/* metadata, repository */) {
};
```

We see that the constructor pulls the GitHub-related parameters from a
`Config` object. It also sets the `protocol` and `host` properties such that
the `GitHubClient` will make calls to `https://api.github.com` by default.
However, in our tests, we will override these properties so that requests go
to `http://localhost` instead.

The parameters `metadata` and `repository` are commented out to avoid unused
argument errors from `npm run lint`. Go ahead and uncomment them now. They
will be used as follows:

- `metadata`: This will contain information from the message that received the
  reaction, used to build the GitHub issue. It will contain two properties:
  `title:`, constructed by the `Middleware` class, and `url:`, which will be
  the permalink for the message.
- `repository`: The name of the repository to which to post the issue. This
  should be just the last component of the repository's GitHub URL after the
  user or organization name specified by `Config.githubUser`.

## Testing

## Check your work

By this point, all of the `GitHubClient` tests should be passing:

```sh
```

Now that you're all finished, compare your solutions to the code in
[`solutions/03-github-client/lib/github-client.js`]({{ site.baseurl }}/solutions/03-github-client/lib/github-client.js)
and
[`solutions/03-github-client/test/github-client-test.js`]({{ site.baseurl }}/solutions/03-github-client/test/github-client-test.js).

You may wish to `git commit` your work to your local repo at this point. After
doing so, try copying the `config.js` file from `solutions/03-github-client`
into `exercises` to see if it passes the test you wrote. Then run `git reset
--hard HEAD` and copy the test files instead to see if your implementation
passes.
