import logger from './logger';
async function stateFromHistory(dispatchId, journal,entries){
	if(!entries)
		entries = await journal.getEntries();	
	var state = {notFound : true};
	var timedOut = 0;
	var failures = 0;
	for (var i = 0; i < entries.length; i++) {
		var entry = entries[i];
		if(entry.dispatchId == dispatchId){
			// if schedule event, set state to scheduled
			if(entry.type == 'ScheduleActivity' || entry.type == 'ScheduleChildWorkflow'){
				state = {scheduled : true, name:entry.name, args:entry.args,failures};
				state.last_activity = entry.date;
			}
			else if(entry.type == 'StartedActivity' || entry.type == 'StartChildWorkflow'){
				state = {started : true, name:entry.name, args:entry.args, last_activity: entry.date,failures};
				state.last_activity = entry.date;
			}
			else if(entry.type == 'Heartbeat' && state.started){
				state.last_activity = entry.date;
			}
			else if(entry.type == 'FailedActivity' || entry.type == 'FailedChildWorkflow'){
				failures++;
				state = {failed : true, failures};
				state.last_activity = entry.date;
			}
			else if(entry.type == 'QueueActivity'){
				state = {queue : true, failures};
				state.last_activity = entry.date;
			}			
			else if(entry.type == 'TimedOutActivity' || entry.type == 'TimedOutChildWorkflow'){
				timedOut++;
				state = {timedOut : true,timedOut,failures};
				state.last_activity = entry.date;
			}
			else if(entry.type == 'FinishedActivity' || entry.type == 'FinishedChildWorkflow'){
				state = {finished : true,result:entry.result};
				state.last_activity = entry.date;
				return state;
			}			
		}
	}
	// logger.debug("activity state: " + JSON.stringify(state));
	return state;
}
export default stateFromHistory;