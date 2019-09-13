"use strict";

module.exports = {
    data: {
        counter: 0
    },
    mounted: function() {
        setInterval(() => {
            this.counter++;
        }, 10);
    }
};