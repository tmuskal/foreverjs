import journalService from './journal_service';
import workflowFactrory from './workflow_factory';
function DoDecisionTask(job){
	// console.log("need to do decision for ", job);
	var journal = journalService.getJournal(job.workflowId);
	var params = journal.getEntries().find(e=>e.type == 'WorkflowStarted')	
	var classFn = workflowFactrory[params.class];
	var instance = new classFn(job.workflowId);
	instance.mainRun = true;	
	try{
		instance[params.name](...params.args);
	}
	catch(e){
		console.log(e);
	}
}
function DoActivityTask(job){
	// console.log("need to do ", job);	
	var journal = journalService.getJournal(job.workflowId);
	var params = journal.getEntries().find(e=>e.type == 'WorkflowStarted')
	var classFn = workflowFactrory[params.class];
	var instance = new classFn(job.workflowId);
	var dispatchId = job.taskId;
	var paramsActivity = journal.getEntries().find(e=>e.dispatchId == dispatchId);
	instance.activityMode = true;
	instance.journal.append({type:"StartedActivity", date: new Date(), dispatchId, args:paramsActivity.args,name:paramsActivity.name});
	try{
		var res = instance[paramsActivity.name](...paramsActivity.args)
		instance.journal.append({type:"FinishedActivity", date: new Date(), dispatchId, result: res});	
	}
	catch(e){
		instance.journal.append({type:"FailedActivity", date: new Date(), dispatchId, error:e});	
	}
	// console.log(instance.journal.getEntries());
	instance.scheduler.taint();
}	
function PeriodicDoDecisionTask(queue){
	queue.getJob(function(job){
		DoDecisionTask(job);
		setTimeout(PeriodicDoDecisionTask,10,queue);
	});	
}
function PeriodicDoActivityTask(queue){
	queue.getJob(function(job){		
		DoActivityTask(job);
		setTimeout(PeriodicDoActivityTask,10,queue);
	});	
}	
class Worker{
	PeriodicDoDecisionTask(queue){
		return PeriodicDoDecisionTask(queue);
	}
	PeriodicDoActivityTask(queue){
		return PeriodicDoActivityTask(queue);
	}
}

export default Worker;