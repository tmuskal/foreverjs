import journalService from './journal/client';
import scheduler from './scheduler/client';
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision,WorkflowTimerDecision,WorkflowDecisionContinueAsNew} from './workflow_signals'
import logger from './logger';

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
		var entries = await journal.getEntries();
		var state = {notFound : true};

		var timedOut = 0;
		var failures = 0;
		for (var i = 0; i < entries.length; i++) {
			var entry = entries[i];
				// if schedule event, set state to scheduled
			if(entry.type == 'WorkflowStarted'){				
				state = {started : true, name:entry.name, args:entry.args};
			}
			else if(entry.type == 'WorkflowComplete'){
				state = {finished : true,result:entry.result};			
			}
			else if(entry.type == 'WorkflowFailed'){
				state = {failed : true,result:entry.result};			
			}
		}	
		logger.debug("wf state: " + JSON.stringify(state));
		return state;
	}
	async stateFromHistory(dispatchId, journal){
		var journal = journal || this.journal;
		var entries = await journal.getEntries();
		var state = {notFound : true};
		var timedOut = 0;
		var failures = 0;
		for (var i = 0; i < entries.length; i++) {
			var entry = entries[i];
			if(entry.dispatchId == dispatchId){
				// if schedule event, set state to scheduled
				if(entry.type == 'ScheduleActivity' || entry.type == 'ScheduleChildWorkflow'){
					state = {scheduled : true, name:entry.name, args:entry.args};
				}
				else if(entry.type == 'StartActivity' || entry.type == 'StartChildWorkflow'){
					state = {started : true, name:entry.name, args:entry.args, last_activity: entry.date};
				}
				else if(entry.type == 'Heartbeat' && state.started){
					state.last_activity = entry.date;
				}
				else if(entry.type == 'FailedActivity' || entry.type == 'FailedChildWorkflow'){
					failures++;
					state = {failed : true, failures};
				}
				else if(entry.type == 'TimedOutActivity' || entry.type == 'TimedOutChildWorkflow'){
					timedOut++;
					state = {timedOut : true,timedOut};
				}
				else if(entry.type == 'FinishedActivity' || entry.type == 'FinishedChildWorkflow'){
					state = {finished : true,result:entry.result};
				}			
			}
		}	
		logger.debug("state: " + JSON.stringify(state));
		return state;
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
			logger.debug("timer fired " + timerId);
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