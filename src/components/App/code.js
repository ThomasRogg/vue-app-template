"use strict";

module.exports = {
    data() {
        return {
            counter: 0
        }
    },
    mounted() {
        setInterval(() => {
            this.counter++;
        }, 10);
    },
    computed: {
        doneLoading() {
            return !this.$store.state.loading;
        }
    }
};