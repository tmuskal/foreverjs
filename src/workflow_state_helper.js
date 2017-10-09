import logger from './logger';

async function workflowStateFromHistory(journal){
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
		if(state){
			state.last_activity = entry.date;
		}
	}	
	// logger.debug("wf state: " + JSON.stringify(state));
	return state;
}
export default workflowStateFromHistory;