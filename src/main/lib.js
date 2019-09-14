"use strict";

exports.IS_SERVER_SIDE = typeof process === 'object';

exports.requireAsync = exports.IS_SERVER_SIDE ? async function requireSync(module) {
    // Do not do asyncronly on server as it is not needed... All modules will be loaded after a while anyhow
    return require(module);
} : window._libExports.requireAbsoluteSync;

exports.importCSS = 0;

exports.importJS = 0;

exports.fetch = 0;

exports.call = exports.IS_SERVER_SIDE ? async function call(module, json) {
    // We can call api's method directly
} : async function call(module, json) {
    // We do a fetch
};

exports.panic = exports.IS_SERVER_SIDE ? function panic(err) {
    console.error(err);
    return new Promise(() => {});
} : window._libExports.panic;

if(!exports.IS_SERVER_SIDE)
    delete window._libExports;