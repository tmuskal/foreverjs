import journalService from './journal/client';
import workflowFactory from './workflow_factory';
import jobQueue from './job_queue/client';
async function DoDecisionTask(job){
	// console.log("need to do decision for ", job);
	
	try{
		var journal = journalService.getJournal(job.workflowId);
		var entries = await journal.getEntries();
		var params = entries.find(e=>e.type == 'WorkflowStarted')	
		var classFn = workflowFactory[params.class];
		var instance = new classFn(job.workflowId);
		instance.mainRun = true;
		await instance[params.name](...Object.values(params.args));
	}
	catch(e){
		console.log(e);
	}
}
async function DoActivityTask(job){
	// console.log("need to do ", job);	
	try{
		var journal = journalService.getJournal(job.workflowId);
		var entries = await journal.getEntries();
		var params = entries.find(e=>e.type == 'WorkflowStarted')
		var classFn = workflowFactory[params.class];
		var instance = new classFn(job.workflowId);
		var dispatchId = job.taskId;
		var paramsActivity = entries.find(e=>e.dispatchId == dispatchId);
		instance.activityMode = true;
		await instance.journal.append({type:"StartedActivity", date: new Date(), dispatchId, args:paramsActivity.args,name:paramsActivity.name});		
		var res = await instance[paramsActivity.name](...Object.values(paramsActivity.args))
		await instance.journal.append({type:"FinishedActivity", date: new Date(), dispatchId, result: res});	
	}
	catch(e){
		await instance.journal.append({type:"FailedActivity", date: new Date(), dispatchId, error:e});	
	}
	// console.log(instance.journal.getEntries());
	await instance.scheduler.taint();
}	
async function PeriodicDoDecisionTask(queue, worker){
	if(worker.stop)
		return;
	var job = await queue.getJob();
	if(job)
		await DoDecisionTask(job);
	setTimeout(PeriodicDoDecisionTask,100,queue, worker);
}
async function PeriodicDoActivityTask(queue, worker){
	if(worker.stop)
		return;
	var job = await queue.getJob();
	if(job)
		await DoActivityTask(job);
	setTimeout(PeriodicDoActivityTask,100,queue, worker);
}	
class Worker{
	constructor(){
		this.stop = false;
	}
	async runAll(){
		var keys = Object.keys(workflowFactory);
		for (var i = keys.length - 1; i >= 0; i--) {		
			await PeriodicDoDecisionTask(jobQueue.getJobQueue("decisions"),this);
			await PeriodicDoActivityTask(jobQueue.getJobQueue("activities"),this);
		}
	}
}

export default Worker;