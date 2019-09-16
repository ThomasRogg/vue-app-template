"use strict";

module.exports = {
    state: {
        loading: false
    },
    mutations: {
        loading(state, val) {
            state.loading = val;
        }
    }
};