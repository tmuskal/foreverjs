const jayson = require('jayson/promise');
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from '../workflow_signals'
import JobQueueServer  from '../job_queue/client';
import workflowFactory from '../workflow_factory';
import journalService from '../journal/client';
function delay(time) {
  return new Promise(function (fulfill) {
    setTimeout(fulfill, time);
  });
}

async function run({className,name,args,id}){
	try{
		var classFn = workflowFactory[className];
		var workflow = new classFn(id);
		workflow.mainDispatch = true;
		return await workflow[name](...args);
	}
	catch(e){
		console.log(e);
		if (e instanceof WorkflowDecision) {
			await delay(1000);
			return await run({className,name,args,id});
		}
		throw e;
	}		
}
var server = jayson.server({
	run:async function ({className,name,args,id}){
		return await run({className,name,args,id});
	},
	taint: async function({workflowId}){
		var decisionTasks = JobQueueServer.getJobQueue("decisions");
		var activityTasks = JobQueueServer.getJobQueue("activities");
	    var journal = journalService.getJournal(workflowId);

		var entries = await journal.getEntries();
		// add schedule if last activity completed or failed
		var tasks = {}
		var childWorkflows = {}
		var lastDecisionTaskState = "notfound"
		var needANewDecisionTask = true;
		for(var i =0; i < entries.length; i++){
			var entry = entries[i];
			switch(entry.type){
				case "FinishedActivity":
					needANewDecisionTask = true;
					tasks[entry.dispatchId].finished = true;
					break;
				case "ScheduleActivity":
					tasks[entry.dispatchId] = {schedule:true};
					break;
				case "FailedActivity":
					needANewDecisionTask = true;
					tasks[entry.dispatchId].failed = true;
					break;
				case "StartedActivity":
					tasks[entry.dispatchId].started = true;
					break;					
				case "DecisionTaskSchedule":
					lastDecisionTaskState = "schedule";
					needANewDecisionTask = false;
					break;
				case "DecisionTaskStarted":
					lastDecisionTaskState = "start";
					needANewDecisionTask = false;
					break;					
				case "DecisionTaskComplete":
					lastDecisionTaskState = "complete";
					break;					
				case "DecisionTaskFailed":
					lastDecisionTaskState = "fail";
					needANewDecisionTask = true;
					break;					
				case "DecisionTaskTimeOut":
					lastDecisionTaskState = "timeout";
					needANewDecisionTask = true;
					break;	
				case 'ScheduleChildWorkflow':
					childWorkflows[entry.dispatchId] = {schedule:true,args:entry.args, name:entry.name,class:entry.class};
					break;
				case 'StartChildWorkflow':
					childWorkflows[entry.dispatchId].started = true;
					break;
				case 'FailedChildWorkflow':
					childWorkflows[entry.dispatchId].failed = true;
					needANewDecisionTask = true;
					break;
				case 'TimedOutChildWorkflow':
					childWorkflows[entry.dispatchId].timedOut = true;
					needANewDecisionTask = true;
					break;
				case 'FinishedChildWorkflow':
					childWorkflows[entry.dispatchId].finished = true;
					needANewDecisionTask = true;
					break;
				case 'WorkflowComplete':
					// release waiting callbacks
					// needANewDecisionTask = false;										
					// taint parent
					if(entry.parent){
						var classFn = workflowFactory[entry.class];
						// console.log(classFn ,childWorkflow.class)
						var instance = new classFn(entry.parent);
						instance.parentWorkflow = workflowId;
						instance.innerDispatch = true;
						await instance.journal.append({type:"FinishedChildWorkflow", date: new Date(), result:entry.result, dispatchId:entry.id});
						await instance.scheduler.taint();
					}
					else{
						// console.log("result",workflowId,entry.result);
					}
					break;
			}
		}
		var tasksIds = Object.keys(tasks);
		for(var i = 0; i < tasksIds.length; i++){
			var taskId = tasksIds[i];
			var task = tasks[taskId];
			if(task.schedule && !task.started){
				await activityTasks.putJob({workflowId:workflowId,taskId});
			}
		}

		var childWorkflowsIds = Object.keys(childWorkflows);
		for(var i = 0; i < childWorkflowsIds.length; i++){
			var childWorkflowId = childWorkflowsIds[i];
			var childWorkflow = childWorkflows[childWorkflowId];
			if(childWorkflow.schedule && !childWorkflow.started){
				// create a new workflow
				// console.log("childWorkflow",childWorkflowId,childWorkflow);				
				var classFn = workflowFactory[childWorkflow.class];

				// console.log(classFn ,childWorkflow.class)
				var instance = new classFn(childWorkflowId);
				instance.parentWorkflow = workflowId;

		  		await journal.append({type:"StartChildWorkflow", date: new Date(), dispatchId:childWorkflowId,class:childWorkflow.class,name:childWorkflow.name});
		  		try{	  
					instance.innerDispatch = true;
					await instance[childWorkflow.name](...Object.values(childWorkflow.args));

					// console.log("res", res);
      				// instance.journal.append({type:"WorkflowComplete", date: new Date(), result:res,name:childWorkflow.name,class:childWorkflow.class,id:childWorkflowId,parent:this.workflowId});

					// this.journal.append({type:"FinishedChildWorkflow", date: new Date(), result:res, dispatchId:childWorkflowId});
					// instance.scheduler.taint();
					// this.taint();
			  		// needANewDecisionTask = true;
			  		// throw new WorkflowNoDecision();
		  		}
		  		catch(e){
		  			if(e instanceof WorkflowDecision){
		  				// this.taint();
		  				// needANewDecisionTask = true;
						if(e instanceof WorkflowNoDecision){
				    	}
				    	if (e instanceof WorkflowDecisionScheduleActivity) {
				    		// add to journal
				    		await instance.journal.append({type:"ScheduleActivity", date: new Date(), dispatchId:e.dispatchId, args:e.args,name:e.name});
				    	}
				    	else if(e instanceof WorkflowDecisionScheduleWorkflow){
				    		// add to journal
				    		await instance.journal.append({type:"ScheduleChildWorkflow", date: new Date(), dispatchId:e.dispatchId, args:e.args,name:e.name,class:e.class});
				    	}
				    	// current decisionTask execution id
				    	// this.journal.append({type:"DecisionTaskComplete", date: new Date()});
						// notify scheduler		
				    	// this.scheduler.taint();		  				
		  				// throw e;
		  			}
		  			else{	  				
		  				console.log(e);
			  			await journal.append({type:"FailedChildWorkflow", date: new Date(), error:e, dispatchId:childWorkflowId});
			  			needANewDecisionTask = true;
		  			}
		  		}
				// run using mainDispatch

			}
		}
		if(needANewDecisionTask){
		  	await journal.append({type:"DecisionTaskSchedule", date: new Date()});
			await decisionTasks.putJob({workflowId:workflowId});
		}

		// can be done periodically
		// check for timeouts: decision task timeouts, child workflow timeouts, main workflow timeouts, activity timeouts (heartbeat, scheduletocomplete, scheduletostart, starttocomplete)
		// check for needed dispatch for activities
		// check for needed dispatch for new workflows
		// check for needed dispatch for decision tasks
	}
	// add decision task schedule when recieves an important change
	// complete workflow
	// fails
	// complete activity
	// timeouts
	
});


const http = server.http()
http.listen(4003);
export default http;
