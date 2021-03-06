/**
 *  Flow base
 */

'use strict';

import path from 'path';
import gulp from 'gulp';
import del from 'del';
import runSequence from 'run-sequence';
import browserSync from 'browser-sync';
import gulpLoadPlugins from 'gulp-load-plugins';
import {output as pagespeed} from 'psi';
import pageres from 'pageres';
import pkg from './package.json';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

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

// Lint scripts
gulp.task('lint', () =>
  gulp.src('resources/scripts/**/*.js')
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failOnError()))
);

// Concatenate and minify JavaScript. Optionally transpiles ES2015 code to ES5.
// to enable ES2015 support remove the line `"only": "gulpfile.babel.js",` in the
// `.babelrc` file.
gulp.task('scripts', () =>
  gulp.src([
      './node_modules/bootstrap/dist/js/bootstrap.js',
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

// Remove unused css
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

// Enforce clean code https://github.com/RobLoach/docpad-plugin-htmlmin/tree/master/test/src/documents
gulp.task('html', () => {
  return gulp.src('craft/templates/**/*.twig')
    .pipe($.useref({searchPath: '{.tmp,craft/templates/}'}))

    // Clean any HTML
    .pipe($.htmlmin({
      removeComments: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      removeOptionalTags: true
    }))
    // Output files
    .pipe($.size({title: 'twig', showFiles: true}))
    .pipe(gulp.dest('craft/templates'));
});

// Lint twig - Rules https://github.com/yaniswang/HTMLHint/wiki/Rules
gulp.task('htmlhint', function() {
  return gulp.src('craft/templates/**/*.twig')
    .pipe($.htmlhint({
      'doctype-first': false,
      'tag-self-close': false,
      'tagname-lowercase': true,
      'id-unique': true
    }))
    .pipe($.htmlhint.reporter())
});

// Viewport sizes http://viewportsizes.com/
gulp.task('pageres', () => {
  return new pageres({delay: 2})
    .src('http://' + pkg.name + '.dev', ['1024x768', 'ipad', 'iphone 5s'], {crop: true})
    .dest(path.join(__dirname, 'readme_assets'))
    .run();
});

// Clean output directory
gulp.task('clean', () => del(['.tmp', 'public/styles', 'public/scripts'], {dot: true}));

// Watch files for changes & reload
gulp.task('serve', [], () => {
  browserSync({
    notify: false,
    // Customize the Browsersync console logging prefix
    logPrefix: 'Flow',
    //https: true,
    proxy: 'http://' + pkg.name + '.dev'
  });

  gulp.watch(['craft/templates/**/*.twig'], ['htmlhint', reload]);
  gulp.watch(['resources/styles/**/*.{scss,css}'], ['styles', reload]);
  gulp.watch(['resources/scripts/**/*.js'], ['lint', 'scripts', reload]);
  gulp.watch(['resources/images/**/*'], ['images', reload]);
});

// Build production files, the default task
gulp.task('default', ['clean'], cb =>
  runSequence(
    'styles',
    ['lint', 'scripts', 'images'],
    cb
  )
);

// need to add css source map then wont need dist
gulp.task('dist', ['clean'], cb =>
  runSequence(
    'styles',
    ['lint', 'uncss', 'scripts', 'images'],
    cb
  )
);

// Run PageSpeed Insights
gulp.task('pagespeed', cb =>
  pagespeed(pkg.domain, {
    strategy: 'mobile'
  }, cb)
);

var realFavicon = require ('gulp-real-favicon');
var fs = require('fs');

var FAVICON_DATA_FILE = 'faviconData.json';

gulp.task('generate-favicon', function(done) {
  realFavicon.generateFavicon({
    masterPicture: './public/images/logo.png',
    dest: './public/favicon',
    iconsPath: '/favicon',
    design: {
      ios: {
        pictureAspect: 'noChange'
      },
      desktopBrowser: {},
      windows: {
        pictureAspect: 'noChange',
        backgroundColor: '#da532c',
        onConflict: 'override'
      },
      androidChrome: {
        pictureAspect: 'noChange',
        themeColor: '#ffffff',
        manifest: {
          name: 'Craft CMS',
          display: 'browser',
          orientation: 'notSet',
          onConflict: 'override',
          declared: true
        }
      },
      safariPinnedTab: {
        pictureAspect: 'silhouette',
        themeColor: '#5bbad5'
      }
    },
    settings: {
      scalingAlgorithm: 'Mitchell',
      errorOnImageTooSmall: false
    },
    markupFile: FAVICON_DATA_FILE
  }, function() {
    done();
  });
});

gulp.task('inject-favicon-markups', function() {
  gulp.src([ './craft/templates/_layout.twig' ])
    .pipe(realFavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).favicon.html_code))
    .pipe(gulp.dest('./craft/templates/'));
});

gulp.task('check-for-favicon-update', function(done) {
  var currentVersion = JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).version;
  realFavicon.checkForUpdates(currentVersion, function(err) {
    if (err) {
      throw err;
    }
  });
});
