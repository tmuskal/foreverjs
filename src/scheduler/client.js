import journalService from '../journal/client';
import workflowFactory from '../workflow_factory';
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from '../workflow_signals'
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
	async scheduleTimer(duration,timerId){
		return (await client.request('scheduleTimer', {workflowId:this.workflowId,duration,timerId})).result;
	}
	async signal(signalId,result){
		return (await client.request('signal', {workflowId:this.workflowId,result,signalId})).result;
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
	async run({className,name,args,id}){
		var res = (await client.request('run', {className,name,args,id}));
		if(res.error)
			throw res.error;
		return res.result;
		
	}
}
export default new SchedulerService();