---
permalink: /setup/
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

> 18f-unit-testing-node@x.y.z test .../unit-testing-node
> gulp test

[15:25:41] Using gulpfile .../unit-testing-node/gulpfile.js
[15:25:41] Starting 'test'...


  Config
    ✓ should validate a valid configuration


  1 passing (4ms)

[15:25:41] Finished 'test' after 18 ms
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
