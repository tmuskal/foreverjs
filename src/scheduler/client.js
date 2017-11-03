import journalService from '../journal/client';
import workflowFactory from '../workflow_factory';
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from '../workflow_signals'
import JobQueueServer from '../job_queue/client';
const jayson = require('jayson/promise');
import config from "../config/config";
var client = jayson.client.http(config.get('SCHEDULER_SERVICE_ENDPOINT') || 'http://localhost:4003');

class Scheduler{	
	constructor(workflowId){
		this.workflowId = workflowId;
		this.journal = journalService.getJournal(workflowId);
		this.decisionTasks = JobQueueServer.getJobQueue("decisions");
		this.activityTasks = JobQueueServer.getJobQueue("activities");				
	}
	async scheduleTimer(duration,timerId){
		var res = (await client.request('scheduleTimer', {workflowId:this.workflowId,duration,timerId}));
		if(res.error)
			throw res.error;
		return res.result;
	}
	async signal(signalId,result){
		var res = (await client.request('signal', {workflowId:this.workflowId,result,signalId}));
		if(res.error)
			throw res.error;

		return res.result;
	}
	async taint(data = {}){
		var res = (await client.request('taint', {workflowId:this.workflowId,recovery:data.recovery}));
		if(res.error)
			throw res.error;
		return res.result;
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
	async run({className,name,args,id}){
		var res = (await client.request('run', {className,name,args,id}));
		if(res.error)
			throw res.error;
		return res.result;
		
	}
}
export default new SchedulerService();