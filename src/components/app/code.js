"use strict";

exports.component = {
    data: {
        counter: 0
    },
    mounted: function() {
        setInterval(() => {
            this.counter++;
        }, 10);
    }
};

class shit {
    constructor() {
        
    }
}