---
title: Minimizing dependencies
---
This application has been designed to keep dependencies to an absolute
minimum. Given the size and scope of the application, isolating the
application from outside changes outweighed the benefit of reusing existing
npm packages for certain functions. Also, parts of the application that would
otherwise be abstracted by such packages provided suitable instructional
examples for automated testing.

However, were this a larger application where the abstraction were worth the
benefit, the following packages might prove suitable:

- [json-schema](https://www.npmjs.com/package/json-schema) or
  [JSV](https://www.npmjs.com/package/JSV) for validating the JSON from the
  configuration file
- [github](https://www.npmjs.com/package/github) for accessing the GitHub API
- [slack](https://www.npmjs.com/package/slack) for accessing the Slack Web API
  (note that the [hubot-slack](https://www.npmjs.com/package/hubot-slack)
  encapsulates the Slack Real Time Messaging API)
