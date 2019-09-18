"use strict";

const path = require('path');

let args = process.argv.slice(2);
if(args.length != 1 || (args[0] != 'production' && args[0] != 'devel-ssr' && args[0] != 'devel')) {
    console.error('Syntax: ./index.js production|devel-ssr|devel');
    return;
}

exports.PRODUCTION              = false;

exports.EXIT_ON_SHELL_CLOSE     = exports.PRODUCTION;
exports.CONSOLE_STDOUT          = !exports.PRODUCTION;
exports.CONSOLE_LOGFILE         = true;

exports.REMOVE_LOG_AFTER_DAYS   = 30;

exports.HTTP_PORT               = exports.PRODUCTION ? 80 : 8000;
exports.HTTP_REDIRECT_HTTPS     = exports.PRODUCTION ? true : false;

exports.HTTPS_PORT              = exports.PRODUCTION ? 443 : 8443;
exports.HTTPS_SSL_KEY           = path.join(__dirname, 'ssl.key');
exports.HTTPS_SSL_CERT          = path.join(__dirname, 'ssl.crt');
//exports.HTTPS_SSL_CA            = path.join(__dirname, 'ssl_ca.cert');

exports.ENABLE_SSR              = exports.PRODUCTION;
exports.ENABLE_TRANSPILATION    = exports.PRODUCTION;
exports.ENABLE_COMPRESSION      = true;

exports.STRICT_MODE             = !exports.PRODUCTION;
// This is the settings which is used when entering "defaults". Sounds reasonable, so a good starting point
exports.TRANSPILATION_TARGETS   = ['> 0.5%, last 2 versions, Firefox ESR, not dead'];
exports.TRANSPILATION_MINIFY    = true;

exports.MAX_BODY_SIZE           = 10 * 1024 * 1024;

exports.CACHE_MAX_FILE_SIZE     = exports.PRODUCTION ? 1024 * 1024 : 0;
exports.MAX_LOG_FILE_SIZE       = 1024 * 1024 * 1024;

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
exports.REDIRECTS = {
    '/lib/vue.js': path.join(__dirname, '../node_modules/vue/dist/vue' + suffix),
    '/lib/vue-router.js': path.join(__dirname, '../node_modules/vue-router/dist/vue-router' + suffix),
    '/lib/vuex.js': path.join(__dirname, '../node_modules/vuex/dist/vuex' + suffix)
};

exports.STYLES = [
    path.join(__dirname, '../node_modules/normalize.css/normalize.css'),
    path.join(__dirname, '../src/main/style.css')
];

exports.SCRIPTS = [
    path.join(__dirname, '../src/main/code.js')
];

exports.PRELOAD_MODULES = [
    '/lib/vue',
    '/lib/vue-router',
    '/lib/vuex'
];
