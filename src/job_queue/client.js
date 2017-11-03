const jayson = require('jayson/promise');
import config from "../config/config";
var client = jayson.client.http(config.get('JOB_QUEUE_SERVICE_ENDPOINT') || 'http://localhost:4002');

class JobQueue {
	constructor(id){
		this.id = id;
	}
	async putJob(job){
		var res = await client.request('putJob',{job, id:this.id});
		if(res.error)
			throw res.error;
		return res.result;
	}
	async getJob(){
		var res = await client.request('getJob',{id:this.id});		
		if(res.error)
			throw res.error;
		return res.result;
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