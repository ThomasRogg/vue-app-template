"use strict";

module.exports = {
    data() {
        if(this.$ssrContext)
            this.$ssrContext.statusCode = 404;

        return {};
    }
};