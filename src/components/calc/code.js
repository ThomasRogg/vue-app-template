module.exports = {
    data: () => {
        return {
            val: 0
        };
    },
    methods: {
        num: (num) => {
            console.log("AA", num);
        },
        dot: () => {
            console.log("dot");
        },
        op: (op) => {
            console.log("op", op);
        }
    }
};