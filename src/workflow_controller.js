import journalService from './journal/client';
import scheduler from './scheduler/client';
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision,WorkflowTimerDecision,WorkflowDecisionContinueAsNew,WorkflowDecisionMultipleDecisions} from './workflow_signals'
import logger from './logger';
import workflowStateFromHistory from './workflow_state_helper'
import activityStateFromHistory from './activity_state_helper'
class WorkflowController{
	constructor(workflowId, activityMode){
		this.workflowId = workflowId;
		this.lastDispatchId = 0;
		this.activityMode = activityMode;
		this.journal = journalService.getJournal(workflowId);
		this.scheduler = scheduler.getScheduler(workflowId);
	}
	async workflowStateFromHistory(journal){
		var journal = journal || this.journal;		
		return workflowStateFromHistory(journal)
	}
	async stateFromHistory(dispatchId, journal){
		var journal = journal || this.journal;
		return activityStateFromHistory(dispatchId, journal)
	}	
	newDispatchID(){
		return this.workflowId +"."+ (++this.lastDispatchId);
	}
	async sleep(durationInSeconds){
		// setup a timer
		var timerId = this.newDispatchID();
		var entries = await this.journal.getEntries();
		var timerFired = entries.find(e=>e.type === 'TimerFired' && e.timerId == timerId);
		if(timerFired){
			logger.debug("timer already fired " + timerId);
			return;
		}

		var timerSetup = entries.find(e=>e.type === 'TimerSetup' && e.timerId == timerId);
		if(!timerSetup){
			logger.debug("setting up time " + timerId);
			throw new WorkflowTimerDecision(durationInSeconds,timerId);
		}
		var threshold = new Date(timerSetup.date.getTime() + durationInSeconds * 1000);
		var timeLeft = threshold.getTime() - new Date().getTime();
		if(timeLeft <= 0){
			// should be moved to scheduler
			// should add have new decision task.						
			// await this.journal.append({type:"TimerFired", date: new Date(),timerId});
			logger.debug("done sleeping" + timerId);
			return;
		}
		else{
			logger.debug("still sleeping "+ timerId);
			throw new WorkflowNoDecision();
		}
	}	
	async parallel_do(list,fn){
		// batch all exceptions
		var exceptions = [];		
		var results = [];
		for (var i = list.length - 1; i >= 0; i--) {
			var thing = list[i];
			try{
				var result = await fn(thing);
				results.push(result);
			}
			catch(ex){
				exceptions.push(ex);
				// aggregate
			}
		}
		if(exceptions.length > 0){
			throw new WorkflowDecisionMultipleDecisions(exceptions);
		}
		return results;
	}
	async waitForSignal(signalId){
		var entries = await this.journal.getEntries();
		var signalFire = entries.find(e=>e.type === 'SignalFired' && e.signalId == signalId);
		if(signalFire){
			return signalFire.result;
		}
		throw new WorkflowNoDecision();
	}
	async doHuman({prepare,process,payload, id}){
		await prepare(payload,id)		
		var result = await this.waitForSignal(id);
		return await process(result,id)
	}	
	async continueAsNew(){
		throw new WorkflowDecisionContinueAsNew(arguments)
	}
}
export default WorkflowController;