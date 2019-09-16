"use strict";

// lazy require, so it is already loaded when getComponent is called
let Vue;

exports.IS_SERVER_SIDE = typeof process == 'object';

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

exports.getComponent = function(name) {
    if(!Vue)
        Vue = require('vue');

    let component = Vue.options.components[name];
    if(!component)
        throw new Error('component ' + name + ' not found');

    return component;
};

if(!exports.IS_SERVER_SIDE)
    delete window._libExports;