"use strict";

const lib = require('./main/lib');

module.exports = {
    mode: 'history',
    routes: [
        { path: '/', component: lib.getComponent('ExampleHello') },
        { path: '/Calc', component: lib.getComponent('ExampleCalc') },
        { path: '*', component: lib.getComponent('FileNotFound') }
    ],
    scrollBehavior(to, from, savedPosition) {
        return {x: 0, y: 0};
    }
};