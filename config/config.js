"use strict";

const path = require('path');

function argsSyntaxError() {
    console.error('Syntax: ./index.js [test|test-ssr|production]');
    process.exit(1);
}

let args = process.argv.slice(2);
if(args.length > 1)
    argsSyntaxError();

if(args.length == 0) {
    console.log("================================================================================");
    console.log("Running in mode 'test'. To run in 'test-ssr' or 'production' mode, specify");
    console.log("the mode in the command line. To change settings more granularly, take a look");
    console.log("at config/config.js.");
    console.log("================================================================================");

    args.push('test');
}

process.title = 'vue-app-template ' + args[0];

if(args[0] == 'test') {
    exports.EXIT_ON_UNCAUGHT        = true;
    exports.EXIT_ON_SHELL_CLOSE     = true;

    exports.CONSOLE_STDOUT          = true;
    
    exports.HTTP_PORT               = 8000;
    exports.HTTP_REDIRECT_HTTPS     = false;
    
    exports.HTTPS_PORT              = 8443;

    exports.ENABLE_SSR              = false;
    exports.ENABLE_TRANSPILATION    = false;
    exports.ENABLE_COMPRESSION      = true;
    
    exports.STRICT_MODE             = true;
    
    exports.CACHE_MAX_FILE_SIZE     = 0;
} else if(args[0] == 'test-ssr') {
    exports.EXIT_ON_UNCAUGHT        = true;
    exports.EXIT_ON_SHELL_CLOSE     = true;
    
    exports.CONSOLE_STDOUT          = true;
    
    exports.HTTP_PORT               = 8000;
    exports.HTTP_REDIRECT_HTTPS     = false;
    
    exports.HTTPS_PORT              = 8443;

    exports.ENABLE_SSR              = true;
    exports.ENABLE_TRANSPILATION    = true;
    exports.ENABLE_COMPRESSION      = true;
    
    exports.STRICT_MODE             = true;
    
    exports.CACHE_MAX_FILE_SIZE     = 1024 * 1024;
} else if(args[0] == 'production') {
    exports.EXIT_ON_UNCAUGHT        = false;
    exports.EXIT_ON_SHELL_CLOSE     = false;
    
    exports.CONSOLE_STDOUT          = false;
    
    exports.HTTP_PORT               = 80;
    exports.HTTP_REDIRECT_HTTPS     = true;
    
    exports.HTTPS_PORT              = 443;

    exports.ENABLE_SSR              = true;
    exports.ENABLE_TRANSPILATION    = true;
    exports.ENABLE_COMPRESSION      = true;

    exports.STRICT_MODE             = false;
    
    exports.CACHE_MAX_FILE_SIZE     = 1024 * 1024;  
} else
    argsSyntaxError();

exports.CONSOLE_LOG_FILE        = true;
exports.ACCESS_LOG_FILE         = true;

exports.REMOVE_LOG_AFTER_DAYS   = 30;
exports.MAX_LOG_FILE_SIZE       = 1024 * 1024 * 1024;

exports.HTTPS_SSL_KEY           = path.join(__dirname, 'ssl.key');
exports.HTTPS_SSL_CERT          = path.join(__dirname, 'ssl.crt');
//exports.HTTPS_SSL_CA            = path.join(__dirname, 'ssl_ca.cert');

exports.MAX_BODY_SIZE           = 10 * 1024 * 1024;

// This is the settings which is used when entering "defaults". Sounds reasonable, so a good starting point
exports.TRANSPILATION_TARGETS   = ['> 0.5%, last 2 versions, Firefox ESR, not dead'];
exports.TRANSPILATION_MINIFY    = true;

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

let suffix = exports.ENABLE_TRANSPILATION && exports.TRANSPILATION_MINIFY ? '.min.js' : '.js';
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
