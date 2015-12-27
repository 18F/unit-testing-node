---
permalink: /components/
title: Designing and testing the components
---
There is no one right place to start. For the sake of the exercise, we will
begin with the `Config` class. It is straightforward to test yet provides
insight into the rest of the program. In your own programs, however, feel free
to start at whichever point seems most clear to you.

For insight into the actual development process of the program, read the
[conclusion]({{ site.baseurl }}/conclusion/).

## Code locations and `require()` paths

All of the starting code for this exercise is in the `exercise/` directory.
All of the solution code is under the `solutions/` directory.

However, all of the `require()` directives for local packages _will not_
contain either prefix. This is because
[`gulpfile.js`]({{ site.baseurl }}/gulpfile.js) changes its directory into
`exercise/` when running `npm test` or other commands.
