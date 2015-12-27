/* jshint node: true */

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');

var fs = require('fs');
var path = require('path');

require('coffee-script/register');

gulp.task('test', function() {
  process.chdir('./exercise');
  return gulp.src('./test/*.js', {read: false})
    // Reporters:
    // https://github.com/mochajs/mocha/blob/master/lib/reporters/index.js
    .pipe(mocha({reporter: 'spec'}));
});

// Lifted from:
// https://github.com/gulpjs/gulp/blob/master/docs/recipes/running-task-steps-per-folder.md
function getSubdirs(dir) {
  return fs.readdirSync(dir)
    .filter(function(filename) {
      return fs.statSync(path.join(dir, filename)).isDirectory();
    })
    .sort();
}

function createTestSolutionsTasks() {
  var rootDir = process.cwd(),
      solutionDirs = getSubdirs('./solutions'),
      produceTask;

  produceTask = function(previousTarget, subdir) {
    var taskLabel = 'test-solutions-' + subdir;

    gulp.task(taskLabel, previousTarget, function() {
      process.chdir(path.join(rootDir, 'solutions', subdir));
      return gulp.src('./**/test/*.js', {read: false})
        .pipe(mocha({reporter: 'spec'}));
    });
    return [taskLabel];
  };

  return solutionDirs.reduce(produceTask, []);
}

gulp.task('test-solutions', createTestSolutionsTasks());

gulp.task('lint', function() {
  return gulp.src(['./exercise/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('lint-all', function() {
  return gulp.src(['**/*.js', '!node_modules/**', '!_site/**'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});
