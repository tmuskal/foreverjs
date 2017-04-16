const jayson = require('jayson/promise');

const innerQueues = {};

var server = jayson.server({
	putJob: async function({job,id}){
		console.log("putJob",id,job)
		var innerQueue = innerQueues[id];
		if(!innerQueue){
			innerQueue = [];
			innerQueues[id] = innerQueue;
		}
		innerQueue.push(job);
	},
	getJob: async function({id}){	
		console.log("getJob", id)	
		var innerQueue = innerQueues[id];
		if(innerQueue && innerQueue.length){
			var res= innerQueue.pop();
			return res;
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
server.http().listen(4002);
