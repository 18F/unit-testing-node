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

## Writing the request function

Much like we did with `SlackClient`, let's make `fileNewIssue` a thin wrapper
around a `makeApiCall` function.  (The parameters `metadata` and `repository`
are commented out to avoid unused argument errors from `npm run lint`. Go
ahead and uncomment them now.)

```js
GitHubClient.prototype.fileNewIssue = function(metadata, repository) {
  return makeApiCall(this, metadata, repository);
};

function makeApiCall(client, metadata, repository) {
}
```

Note that `makeApiCall` is not a member of `GitHubClient`, and that its first
parameter, `client`, is actually the `this` reference from the `GitHubClient`
methods. `makeApiCall` is going to define a [nested
function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#Nested_functions_and_closures) to launch an
asynchronous HTTP request. Were `makeApiCall` a member of `GitHubClient`,
[inside the nested handler, `this` would not refer to the `GitHubClient`
object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#Lexical_this).
This can prove very confusing, especially to people with experience in
object-oriented languages. Translating `this` to `client` in this way
sidesteps the problem, and having `makeApiCall` private to the module keeps
the `GitHubClient` interface narrow.

## Selecting HTTP vs. HTTPS

Let's import the [`http`](https://nodejs.org/api/http.html) and
[`https`](https://nodejs.org/api/https.html) modules from the Node.js standard
library:

```js
var http = require('http');
var https = require('https');
```

Both have a `request` function that accepts the same set of HTTP options that
we will build using a helper function. So as the first step in implementing
`fileNewIssue`, let's select the correct library depending on whether the code
is running under test or in production:

```js
function makeApiCall(client, metadata, repository) {
  var requestFactory = (client.protocol === 'https:') ? https : http;
};
```

## Building the API method parameters

The `metadata` argument to `makeApiCall` will contain information from the
message that received the reaction from which to build the GitHub issue. It
will contain two properties: `title:`, constructed by the `Middleware` class,
and `url:`, which will be the permalink for the message.

The `repository` argument is name of the repository to which to post the
issue. This should be just the last component of the repository's GitHub URL
after the user or organization name specified by `Config.githubUser`. For
example, for `{{ site.repos[0].url }}`, this would be `{{ site.repos[0].url |
split:"/" | last }}`.

We'll use the `metadata` object to create the [issue creation API method
parameters](https://developer.github.com/v3/issues/#create-an-issue) as a JSON
object, encoded as a string in the request body:

```js
  var requestFactory = (this.protocol === 'https:') ? https : http,
      paramsStr = JSON.stringify({
        title: metadata.title,
        body: metadata.url
      });
```

## Building the HTTP options

The HTTP request is straightforward to build, if a little cumbersome. So let's
introduce a helper function:

```js
function getHttpOptions(client, repository, paramsStr) {
  return {
    protocol: client.protocol,
    host: client.host,
    port: client.port,
    path: '/repos/' + client.user + '/' + repository + '/issues',
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': 'token ' + process.env.HUBOT_GITHUB_TOKEN,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(paramsStr, 'utf8'),
      'User-Agent': packageInfo.name + '/' + packageInfo.version
    }
  };
}
```

A few things to note here:

- We assign `port: client.port`. When `port:` is undefined, the request uses
  the default port for HTTP (80) or HTTPS(443). In our tests, we will launch a
  local HTTP server with a dynamically-assigned port. We'll assign this port
  value as a property of the `GitHubClient` instance under test. In
  `getHttpOptions`, that dynamic port value will then propagate to this
  options object.
- We [specify the GitHub API version in the `Accept`
  header](https://developer.github.com/v3/#current-version)
- Unlike with the Slack API, we [pass the GitHub API token in the
  `Authorization` header](https://developer.github.com/v3/#authentication).
  This token comes from the `HUBOT_GITHUB_TOKEN` environment variable,
  accessible via
  [`process.env`](https://nodejs.org/api/process.html#process_process_env).
- Unlike with the Slack API, we assign the `Content-Type` and `Content-Length`
  since the parameters (encoded as `paramsStr`) will appear in the request
  body as JSON.
- We calculate `Content-Length` using
  [`Buffer.byteLength`](https://nodejs.org/api/buffer.html#buffer_class_method_buffer_bytelength_string_encoding)
  rather than relying on `paramsStr.length`, which may be smaller than the
  actual byte length due to multibyte characters.
- [GitHub requires the `User-Agent` header](https://developer.github.com/v3/#user-agent-required)
  which we've set to [the name and version of the
  program](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.43).

To import `packageInfo` properties that we use in the `User-Agent` definition,
add the following `require` statement to the top of the file:

```js
var packageInfo = require('../package.json');
```

## Making the HTTP request using `Promise`

[`Promises`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
represent asynchronous operations that will either _resolve_ to a value or be
_rejected_ with an error. For background, please see the [`SlackClient`
section on `Promises`]({{ site.baseurl }}/components/slack-client/#promises),
as well as
[`Promise` gotcha #0]({{ site.baseurl }}/components/slack-client/#promises-gotcha-0)
and
[`Promise` gotcha #1]({{ site.baseurl }}/components/slack-client/#promises-gotcha-1).

Let's start fleshing out the rest of `makeApiCall` by defining a `Promise`:

```js
function makeApiCall(client, metadata, repository) {
  var requestFactory = (client.protocol === 'https:') ? https : http,
      paramsStr = JSON.stringify({
        title: metadata.title,
        body: metadata.url
      });

  return new Promise(function(resolve, reject) {
    // We'll fill in the implementation here shortly.
  });
}
```

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
