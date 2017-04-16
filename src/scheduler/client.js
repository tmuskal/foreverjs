import journalService from '../journal/client';
import JobQueueServer from '../job_queue/client';
const jayson = require('jayson/promise');
var client = jayson.client.http('http://localhost:4003');
class Scheduler{
	constructor(workflowId){
		this.workflowId = workflowId;
		this.journal = journalService.getJournal(workflowId);
		this.decisionTasks = JobQueueServer.getJobQueue("decisions");
		this.activityTasks = JobQueueServer.getJobQueue("activities");				
	}
	async taint(){
		return (await client.request('taint', {workflowId:this.workflowId})).result;
	}	
}
class SchedulerService{
	constructor(){
		this.schedulers = {};
	}
	getScheduler(id){
		var scheduler = this.schedulers[id];
		if(!scheduler){			
			this.schedulers[id] = scheduler = new Scheduler(id);
		}
		return scheduler;
	}	
}
export default new SchedulerService();