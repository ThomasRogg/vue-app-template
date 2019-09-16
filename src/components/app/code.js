"use strict";

module.exports = {
    data: () => {
        return {
            counter: 0
        }
    },
    mounted: function() {
        setInterval(() => {
            this.counter++;
        }, 10);
    }
};