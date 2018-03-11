const innerQueues = {};
import logger from '../logger';
const plugin = {
    init: async function() {},
    putJob: async function({ job, id }) {
        // console.log("putJob",id,job)
        logger.debug("put job " + id, job);
        var innerQueue = innerQueues[id];
        if (!innerQueue) {
            innerQueue = [];
            innerQueues[id] = innerQueue;
        }
        innerQueue.unshift(job);
        logger.debug("job queue " + id + " " + innerQueue.length);
    },
    getJob: async function({ id }) {
        // console.log("getJob", id)	
        function _getJob() {
            const innerQueue = innerQueues[id];
            if (!innerQueue || !innerQueue.length)
                return;
            logger.debug("job queue " + id + " " + innerQueue.length);
            switch (process.env.QUEUE_TYPE) {
                case "random":
                    return innerQueue.splice(Math.floor(Math.random() * innerQueue.length), 1);
                case "lifo":
                    return innerQueue.splice(0, 1);
                default:
                    // and case "fifo":
                    return [innerQueue.pop()];
            }
        }
        const res = _getJob();
        if (res && res.length)
            return res[0];
    }
};

export default plugin;
