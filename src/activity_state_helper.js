import logger from './logger';
async function stateFromHistory(dispatchId, journal){
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
			else if(entry.type == 'StartedActivity' || entry.type == 'StartChildWorkflow'){
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
	// logger.debug("activity state: " + JSON.stringify(state));
	return state;
}
export default stateFromHistory;