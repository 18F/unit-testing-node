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


  0 passing (1ms)

[15:25:41] Finished 'test' after 18 ms
```

### Adding this exercise's tools and frameworks to a project

To add the testing frameworks from this exercise to your own project, run:

```sh
$ npm install chai chai-as-promised mocha --save-dev
```

If you wish to use [Gulp](https://www.npmjs.com/package/gulp) as your build
tool, as in this tutorial: 

```sh
$ npm install gulp gulp-mocha --save-dev
```

It's also good practice to apply a linting tool such as
[JSHint](https://www.npmjs.com/package/jshint):

```sh
$ npm install jshint gulp-jshint --save-dev
```

This project's `gulpfile.js` can be the starting point for your own:

```js
/* jshint node: true */

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');

gulp.task('test', function() {
  return gulp.src('./test/*.js', {read: false})
    // Reporters:
    // https://github.com/mochajs/mocha/blob/master/lib/reporters/index.js
    .pipe(mocha({reporter: 'spec'}));
});

gulp.task('lint', function() {
  return gulp.src(['*.js', 'lib/**/*.js', 'test/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});
```

Finally, add this [`scripts:` stanza to your
`package.json`](https://docs.npmjs.com/files/package.json#scripts):

```json
{
  "scripts": {
    "test": "gulp test",
    "lint": "gulp lint"
  }
}
```

Now you're ready to run your tests and linter via:

```sh
$ npm test
$ npm run-script lint
```
