import journalService from './journal_service';
import Scheduler from './scheduler';

class WorkflowController{
	constructor(workflowId, activityMode){
		this.workflowId = workflowId;
		this.lastDispatchId = 0;
		this.activityMode = activityMode;
		this.journal = journalService.getJournal(workflowId);
		this.scheduler = new Scheduler(workflowId, journalService);
	}
	workflowStateFromHistory(journal){
		var journal = journal || this.journal;		
		var entries = journal.getEntries();
		var state = {notFound : true};

		var timedOut = 0;
		var failures = 0;
		for (var i = 0; i < entries.length; i++) {
			var entry = entries[i];
				// if schedule event, set state to scheduled
			if(entry.type == 'WorkflowStarted'){
				state = {scheduled : true, name:entry.name, args:entry.args};
			}
			else if(entry.type == 'WorkflowComplete'){
				state = {finished : true,result:entry.result};			
			}
		}	
		return state;
	}
	stateFromHistory(dispatchId, journal){
		var journal = journal || this.journal;
		var entries = journal.getEntries();
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
					state = {started : true, name:entry.name, args:entry.args};
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
		return state;
	}	
	newDispatchID(){
		return this.workflowId +"."+ (++this.lastDispatchId);
	}
	sleep(){
		// setup a timer
	}
	waitForSignal(){

	}
}
export default WorkflowController;