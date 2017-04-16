const jayson = require('jayson/promise');
var client = jayson.client.http('http://localhost:4002');

class JobQueue {
	constructor(id){
		this.id = id;
	}
	putJob(job){
		return client.request('putJob',{job, id:this.id});
	}
	async getJob(){
		return (await client.request('getJob',{id:this.id})).result;
	}
}
class JobQueueService{
	constructor(){
		this.queues = {};
	}
	getJobQueue(id){
		var queue = this.queues[id];
		if(!queue){			
			this.queues[id] = queue = new JobQueue(id);
		}
		return queue;
	}	
}

export default new JobQueueService();