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

## Code locations

All of the starting code for this exercise is in the `exercise/` directory.

All of the solution code is in the `solutions/` directory. Each step of the
exercise will have solution code in a separate directory within `solutions/`.
The solution code for the entire exercise is in `solutions/complete`.

## `require()` paths

All of the `require()` directives for local packages _will not_
contain either the `exercise/` or `solutions/` prefixes. This is because the
[`gulpfile.js`]({{ site.baseurl }}/gulpfile.js) tasks change into the
appropriate directory before running `npm` commands.

## Commit your work!

Don't forget to `git commit` your work frequently, especially before moving on
to a new section of this exercise.

## Check your work!

After completing each exercise and running `git commit`, try copying
implementation files from `solutions/` into the `exercise/` directory to see if
they pass your tests. Then, after running `git reset --hard HEAD`, try copying
the test files from `solutions/` into `exercise/` to see if your
implementation passes.
