/**
 *  Flow base
 */

'use strict';

// This gulpfile makes use of new JavaScript features.
// Babel handles this without us having to do anything. It just works.
// You can read more about the new JavaScript features here:
// https://babeljs.io/docs/learn-es2015/

import path from 'path';
import gulp from 'gulp';
import del from 'del';
import runSequence from 'run-sequence';
import browserSync from 'browser-sync';
import gulpLoadPlugins from 'gulp-load-plugins';
import {output as pagespeed} from 'psi';
import Pageres from 'pageres';
import pkg from './package.json';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

// Lint scripts
gulp.task('lint', () =>
  gulp.src('resources/scripts/**/*.js')
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failOnError()))
);

// Optimize images
gulp.task('images', () =>
  gulp.src('resources/images/**/*')
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest('public/images'))
    .pipe($.size({title: 'images'}))
);

// Compile and automatically prefix stylesheets
gulp.task('styles', () => {
  const AUTOPREFIXER_BROWSERS = [
    'ie >= 10',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
  ];

  // For best performance, don't add Sass partials to `gulp.src`
  return gulp.src([
      'resources/styles/**/*.scss',
      'resources/styles/**/*.css'
    ])
    .pipe($.newer('.tmp/styles'))
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      precision: 10
    }).on('error', $.sass.logError))
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest('.tmp/styles'))
    // Concatenate and minify styles
    .pipe($.if('*.css', $.cssnano()))
    .pipe($.size({title: 'styles'}))
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest('public/styles'));
});

// Concatenate and minify JavaScript. Optionally transpiles ES2015 code to ES5.
// to enable ES2015 support remove the line `"only": "gulpfile.babel.js",` in the
// `.babelrc` file.
gulp.task('scripts', () =>
  gulp.src([
      './resources/scripts/app.js'
      // Other scripts
    ])
    .pipe($.newer('.tmp/scripts'))
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('.tmp/scripts'))
    .pipe($.concat('app.min.js'))
    .pipe($.uglify({preserveComments: 'some'}))
    // Output files
    .pipe($.size({title: 'scripts'}))
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('public/scripts'))
);

gulp.task('uncss', function() {
  return gulp.src('public/styles/app.css')
    .pipe($.uncss({
      html: [
        // should use sitemap, something like https://gladdy.uk/blog/2014/04/13/using-uncss-and-grunt-uncss-with-wordpress/
        'http://' + pkg.name + '.dev'
      ]
    }))
    .pipe($.cssnano())
    .pipe(gulp.dest('public/styles/'));
});

// Viewport sizes http://viewportsizes.com/
gulp.task('pageres', () => {
  return new Pageres({delay: 2})
    .src('http://' + pkg.name + '.dev', ['1024x768', 'ipad', 'iphone 5s'], {crop: true})
    .dest(path.join(__dirname, 'readme_assets'))
    .run();
});

// Enforce clean code
gulp.task('html', () => {
  return gulp.src('craft/templates/404.twig')
    .pipe($.useref({searchPath: '{.tmp,app}'}))

    // Minify any HTML
    .pipe($.if('*.twig', $.htmlmin({
      removeComments: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      removeOptionalTags: true
    })))
    // Output files
    .pipe($.if('*.twig', $.size({title: 'twig', showFiles: true})))
    .pipe(gulp.dest('dist'));
});

// Clean output directory
gulp.task('clean', () => del(['.tmp', 'public/styles', 'public/scripts'], {dot: true}));

// Watch files for changes & reload
gulp.task('serve', [], () => {
  browserSync({
    notify: false,
    // Customize the Browsersync console logging prefix
    logPrefix: 'Flow Comms',
    // Allow scroll syncing across breakpoints
    scrollElementMapping: ['app', '.mdl-layout'],
    //https: true,
    proxy: 'http://' + pkg.name + '.dev'
  });

  gulp.watch(['craft/templates/**/*.twig'], reload);
  gulp.watch(['resources/styles/**/*.{scss,css}'], ['styles', reload]);
  gulp.watch(['resources/scripts/**/*.js'], ['lint', 'scripts', reload]);
  gulp.watch(['resources/images/**/*'], ['images', reload]);
});

// Build production files, the default task
gulp.task('default', ['clean'], cb =>
  runSequence(
    'styles',
    ['lint', 'uncss', 'scripts', 'images'],
    cb
  )
);

// Run PageSpeed Insights
gulp.task('pagespeed', cb =>
  // Update the below URL to the public URL of your site
  pagespeed(pkg.domain, {
    strategy: 'mobile'
    // By default we use the PageSpeed Insights free (no API key) tier.
    // Use a Google Developer API key if you have one: http://goo.gl/RkN0vE
    // key: 'YOUR_API_KEY'
  }, cb)
);

