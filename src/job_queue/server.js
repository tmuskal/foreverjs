const jayson = require('jayson/promise');
import logger from '../logger';

const innerQueues = {};

var server = jayson.server({
	putJob: async function({job,id}){
		// console.log("putJob",id,job)
		logger.debug("put job " + id,job);
		var innerQueue = innerQueues[id];
		if(!innerQueue){
			innerQueue = [];
			innerQueues[id] = innerQueue;
		}		
		innerQueue.unshift(job);
		logger.debug("job queue " + id + " " + innerQueue.length);
	},
	getJob: async function({id}){	
		// console.log("getJob", id)	
		var innerQueue = innerQueues[id];
		let res;
		if(innerQueue && innerQueue.length){
			switch(process.env.QUEUE_TYPE)
			{
				case "random":
					res = innerQueue.splice(Math.floor(Math.random()*innerQueue.length), 1);
					if(res.length > 0)
						return res[0];			
					else return null;
				case "fifo":
					return  innerQueue.pop();
				case "lifo":
					res = innerQueue.splice(0, 1);
					if(res.length > 0)
						return res[0];
					else return null;
				default:
					// fifo
					return innerQueue.pop();
			}					
		}
		else{
			return null;
			// if(times > 100)
			// 	cb();
			// else
			// 	setTimeout(this.getJob.bind(this),100,cb, times+1);
		}
	}
});

const http = server.http()
export default http;
