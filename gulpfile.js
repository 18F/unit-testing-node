/* jshint node: true */

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
require('coffee-script/register');

gulp.task('test', function() {
  return gulp.src('./exercise/test/*.js', {read: false})
    // Reporters:
    // https://github.com/mochajs/mocha/blob/master/lib/reporters/index.js
    .pipe(mocha({reporter: 'spec'}));
});

gulp.task('test-solution', function() {
  return gulp.src('./solution/test/*.js', {read: false})
    .pipe(mocha({reporter: 'spec'}));
});

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
