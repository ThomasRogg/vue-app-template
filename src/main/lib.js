"use strict";

exports.IS_SERVER_SIDE = typeof process === 'object';

exports.requireAsync = exports.IS_SERVER_SIDE ? async function requireSync(module) {
    // Do not do asyncronly on server as it is not needed... All modules will be loaded after a while anyhow
    return require(module);
} : window._libExports.requireAbsoluteSync;

exports.fetch = 0;  // TODO

exports.api = exports.IS_SERVER_SIDE ? async function api(module, json) {
    // We can call api's method directly
} : async function api(module, json) {
    // We do a fetch
};

exports.panic = exports.IS_SERVER_SIDE ? function panic(err) {
    throw err;
} : window._libExports.panic;

if(!exports.IS_SERVER_SIDE)
    delete window._libExports;