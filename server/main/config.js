"use strict";

const path = require('path');

exports.PRODUCTION              = false;

exports.STRICT_MODE             = !exports.PRODUCTION;
exports.ENABLE_TRANSPILATION    = exports.PRODUCTION;
exports.ENABLE_COMPRESSION      = true;

exports.TRANSPILATION_TARGETS   = ['IE 10, last 2 versions'];
exports.TRANSPILATION_MINIFY    = true;

exports.ENABLE_SSR              = !exports.PRODUCTION;
exports.WATCH_SRC_DIRECTORY     = !exports.PRODUCTION;

exports.MAX_BODY_SIZE           = 10 * 1024 * 1024;
exports.CACHE_MAX_FILE_SIZE     = 1024 * 1024;

exports.FILE_EXTENSIONS = {
    'html': {mime: 'text/html; charset=utf-8', compress: true},
    'css':  {mime: 'text/css; charset=utf-8', compress: true},
    'js':   {mime: 'application/javascript; charset=utf-8', compress: true, javaScript: true},
    'txt':  {mime: 'text/plain; charset=utf-8', compress: true},
    'png':  {mime: 'image/png', compress: false},
    'jpg':  {mime: 'image/jpeg', compress: false},
    'jpeg': {mime: 'image/jpeg', compress: false},
    'gif':  {mime: 'image/gif', compress: true},
    'ico':  {mime: 'image/x-icon', compress: true}
};

let suffix = exports.PRODUCTION ? '.min.js' : '.js';
exports.LIBS = {
    'vue': path.join(__dirname, '../../node_modules/vue/dist/vue' + suffix),
    'vuex': path.join(__dirname, '../../node_modules/vuex/dist/vuex' + suffix)
};

exports.SRC_PATH = path.join(__dirname, '../../src');