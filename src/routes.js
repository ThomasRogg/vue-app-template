"use strict";

const VueRouter = require('vue-router');
const lib = require('./main/lib');

module.exports = () => {
    return new VueRouter({
        mode: 'history',
        routes: [
            { path: '/', component: lib.getComponent('Hello') },
            { path: '/Calc', component: lib.getComponent('Calc') },
            { path: '*', component: lib.getComponent('FileNotFound') }
        ]
    });
};