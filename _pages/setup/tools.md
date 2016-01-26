---
title: Adding the tools to your own project
---
To add the testing frameworks from this exercise to your own project, run:

```sh
$ npm install chai chai-as-promised chai-things mocha sinon --save-dev
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

This `gulpfile.js` can be the starting point for your own:

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
$ npm run lint
```
