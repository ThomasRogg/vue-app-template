module.exports = {
    data: function() {
        if(this.$ssrContext)
            this.$ssrContext.statusCode = 404;

        return {};
    }
};