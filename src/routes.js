"use strict";

const lib = require('./main/lib');

module.exports = [
    { path: '/', component: lib.getComponent('Hello') },
    { path: '/Calc', component: lib.getComponent('Calc') },
    { path: '*', component: lib.getComponent('FileNotFound') }
];