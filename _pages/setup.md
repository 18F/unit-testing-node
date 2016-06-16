---
title: Setup
---
Once your Node.js environment is set up the way you want it, clone the
repository for this exercise to your local machine, change into the directory
containing the clone, and install everything necessary for this exercise via
the following commands:

```shell
$ git clone https://github.com/18F/unit-testing-node.git
$ cd unit-testing-node
$ npm install
```

You can then check that everything is working by running `npm test`, and the
output should look similar to the below:

```shell
$ npm test

> 18f-unit-testing-node@0.0.0 test /Users/michaelbland/src/18F/unit-testing-node
> gulp test

[16:32:07] Using gulpfile ~/src/18F/unit-testing-node/gulpfile.js
[16:32:07] Starting 'test'...


  Config
    - should validate a valid configuration

  GitHubClient
    - should successfully file an issue

  Integration test
    - should successfully load the application script

  Logger
    - should prefix info messages with the script name

  Middleware
    parseMetadata
      - should parse GitHub request metadata from a message
    findMatchingRule
      - should find the rule matching the message
    execute
      - should successfully parse a message and file an issue

  Rule
    - should contain all the fields from the configuration

  SlackClient
    getReactions
      - should make a successful request


  0 passing (4ms)
  9 pending

[16:32:07] Finished 'test' after 35 ms
Restoration of starting state successful
```

## Create a working branch

It's _strongly_ suggested that you create a working branch. This way, you can
checkpoint your work, compare it against the solution code, and generally
avoid pushing unintended changes upstream (if you have push access):

```sh
$ git checkout -b my-working-branch
```

## Offline viewing

With this repository cloned to your local machine, you can view the website
locally if you prefer. Run the following command in a new terminal window:

```sh
$ ./go serve

Configuration file: /.../unit-testing-node/_config.yml
            Source: /.../unit-testing-node
       Destination: /.../unit-testing-node/_site
 Incremental build: enabled
      Generating...
                    done in 0.69 seconds.
 Auto-regeneration: enabled for '/.../unit-testing-node'
Configuration file: /.../unit-testing-node/_config.yml
    Server address: http://127.0.0.1:4000/
  Server running... press ctrl-c to stop.
```

You can now view the website at
[`http://localhost:4000/`](http://localhost:4000/).
