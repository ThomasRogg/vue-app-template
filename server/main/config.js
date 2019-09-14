"use strict";

const path = require('path');

exports.PRODUCTION              = false;

exports.HTTP_PORT               = exports.PRODUCTION ? 80 : 8000;
exports.HTTPS_PORT              = exports.PRODUCTION ? 443 : 8443;

exports.HTTPS_REDIRECT_HTTP     = exports.PRODUCTION ? true : false;
exports.HTTPS_SSL_KEY           = path.join(__dirname, '../../config/ssl.key');
exports.HTTPS_SSL_CERT          = path.join(__dirname, '../../config/ssl.crt');
//exports.HTTPS_SSL_CA            = path.join(__dirname, '../../config/ssl_ca.cert');

exports.ENABLE_SSR              = true;
exports.ENABLE_TRANSPILATION    = exports.PRODUCTION;
exports.ENABLE_COMPRESSION      = true;

exports.STRICT_MODE             = !exports.PRODUCTION;
exports.TRANSPILATION_TARGETS   = ['IE 10, last 2 versions'];
exports.TRANSPILATION_MINIFY    = true;

exports.MAX_BODY_SIZE           = 10 * 1024 * 1024;
exports.CACHE_MAX_FILE_SIZE     = exports.PRODUCTION ? 1024 * 1024 : 0;

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