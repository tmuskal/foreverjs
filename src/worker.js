import journalService from './journal/client';
import workflowFactory from './workflow_factory';
import jobQueue from './job_queue/client';
import logger from './logger';

function delay(time) {
  return new Promise(function (fulfill) {  	
    setTimeout(fulfill, time);
  });
}

async function DoDecisionTask(job){
	// console.log("need to do decision for ", job);
	try{
		logger.debug("DoDecisionTask " + job.workflowId);
		var journal = journalService.getJournal(job.workflowId);
		var entries = await journal.getEntries();
		if(entries.find(e=>e.type === 'Archive')){
			logger.debug("DONE - DoDecisionTask - Archives" + job.workflowId);
			return;
		}
		var params = entries.find(e=>e.type === 'WorkflowStarted')
		if(!params){
			logger.warn("DONE - DoDecisionTask - no WorkflowStarted" + job.workflowId);
			return
		}
		var classFn = workflowFactory[params.class];		
		var instance = new classFn(job.workflowId);
		instance.mainRun = true;
		await instance[params.name](...Object.values(params.args));
		logger.debug("DONE - DoDecisionTask " + job.workflowId);
	}
	catch(e){
		logger.warn("FAIL - DoDecisionTask " + job.workflowId, e);
	}
}
async function DoActivityTask(job){
	// console.log("need to do ", job);	
	let instance;
	try{
		logger.debug("DoActivityTask " + job.taskId);
		var journal = journalService.getJournal(job.workflowId);
		var entries = await journal.getEntries();
		var params = entries.find(e=>e.type == 'WorkflowStarted')
		var classFn = workflowFactory[params.class];
		instance = new classFn(job.workflowId);
		var dispatchId = job.taskId;
		var paramsActivity = entries.find(e=>e.dispatchId == dispatchId);
		instance.activityMode = true;		
		await instance.journal.append({type:"StartedActivity", date: new Date(), dispatchId, args:paramsActivity.args,name:paramsActivity.name});		
		var res = await instance[paramsActivity.name](...Object.values(paramsActivity.args));			
		await instance.journal.append({type:"FinishedActivity", date: new Date(), dispatchId, result: res});	
		logger.debug("DONE - DoActivityTask " + job.taskId);
	}
	catch(e){
		logger.warn(e);
		await instance.journal.append({type:"FailedActivity", date: new Date(), dispatchId, error:e});	
		logger.debug("FAILED - DoActivityTask " + job.taskId);
	}
	// console.log(instance.journal.getEntries());
	await instance.scheduler.taint();
}	
async function PeriodicDoDecisionTask(queue, worker){
	if(worker.stop)
		return;
	try{
		var job = await queue.getJob();
		if(job)
			await DoDecisionTask(job);
		else{
			await delay(500);
		}
	}
	catch(e){	
	}	
	setTimeout(()=>{
		PeriodicDoDecisionTask(queue, worker);
	},0);	
}
async function PeriodicDoActivityTask(queue, worker){
	if(worker.stop)
		return;
	try{
		var job = await queue.getJob();
		if(job)
			await DoActivityTask(job);
		else{
			await delay(500);
		}
	}
	catch(e){
	}	
	setTimeout(()=>{
		PeriodicDoActivityTask(queue, worker);
	},0);
	
}	
class Worker{
	constructor(){
	}
	async runAll(){		
		for (var i = 0; i < process.env.FJS_DECISION_WORKERS || 0; i++) {
			PeriodicDoDecisionTask(jobQueue.getJobQueue("decisions"),this);
		}
		for (var i = 0; i < process.env.FJS_ACTIVITY_WORKERS || 0; i++) {
			PeriodicDoActivityTask(jobQueue.getJobQueue("activities"),this);			
		}
	}
}

export default Worker;