const jayson = require('jayson/promise');
const moment = require("moment");
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision,WorkflowTimerDecision} from '../workflow_signals'
import JobQueueServer  from '../job_queue/client';
import workflowFactory from '../workflow_factory';
import journalService from '../journal/client';
import logger from '../logger';
import workflowStateFromHistory from '../workflow_state_helper'
import activityStateFromHistory from '../activity_state_helper'


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
		if (e instanceof WorkflowDecision) {
			await delay(1000);
			return await run({className,name,args,id});
		}
		console.log(e);
		throw e;
	}		
}
async function taint({workflowId}){
	return await srv.taint({workflowId});
}

var srv = {
	run:async function ({className,name,args,id}){
		return await run({className,name,args,id});
	},
	recover:async function (){
		await delay(5000);
		const journals = await journalService.getJournals();
		const journals_with_entries = await Promise.all(journals.result.map(async (j)=> {
			const journal = journalService.getJournal(j);			
			const entries = await journal.getEntries();
			if(!entries.find(e=>e.type==="WorkflowStarted"))
				return Promise.resolve();				

			if(!entries.find(e=>e.type==="WorkflowComplete")){
				logger.debug("Recovering",j)
				return srv.taint({workflowId: j});
			}
			else
			{
				return Promise.resolve();
			}
		}));

		// await Promise.all(journals.result.map(j=>srv.taint({workflowId: j})));
	},
	scheduleTimer: async function({duration,timerId,workflowId}){
		await delay(duration * 1000);
	    var journal = journalService.getJournal(workflowId);
		await journal.append({type:"TimerFired", date: new Date(),timerId});
		await journal.append({type:"DecisionTaskSchedule", date: new Date()});
		var decisionTasks = JobQueueServer.getJobQueue("decisions");
		await decisionTasks.putJob({workflowId:workflowId});
	},
	signal:async function ({workflowId, signalId,result}){
	    var journal = journalService.getJournal(workflowId);
		await journal.append({type:"SignalFired", date: new Date(), result ,signalId});		
		await journal.append({type:"DecisionTaskSchedule", date: new Date()});
		var decisionTasks = JobQueueServer.getJobQueue("decisions");
		await decisionTasks.putJob({workflowId:workflowId});
	},	
	taint: async function({workflowId}){		
		var decisionTasks = JobQueueServer.getJobQueue("decisions");
		var activityTasks = JobQueueServer.getJobQueue("activities");
	    var journal = journalService.getJournal(workflowId);
	    var parent;
		var entries = await journal.getEntries();
		// console.log("entries",entries)
		// add schedule if last activity completed or failed
		logger.debug('in taint',workflowId,entries.length);
		var tasks = {}
		var childWorkflows = {}
		var lastDecisionTaskState = "notfound"
		var needANewDecisionTask = true;
		var lastDecisionTaskDate;
		for(var i =0; i < entries.length; i++){
			var entry = entries[i];
			switch(entry.type){
				case "FinishedActivity":
					needANewDecisionTask = true;
					tasks[entry.dispatchId].finished = true;
					break;
				case "ScheduleActivity":
					var failedCount = 0;
					if(tasks[entry.dispatchId])
						failedCount = tasks[entry.dispatchId].failedCount;
					tasks[entry.dispatchId] = {schedule:true,failedCount};
					break;
				case "FailedActivity":
					needANewDecisionTask = true;
					tasks[entry.dispatchId].failed = true;
					if(!tasks[entry.dispatchId].failedCount){
						tasks[entry.dispatchId].failedCount=1;
					}
					else {
						tasks[entry.dispatchId].failedCount++;
					}
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
					lastDecisionTaskDate = entry.date;
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
					var failedCount = 0;
					if(childWorkflows[entry.dispatchId])
						failedCount = childWorkflows[entry.dispatchId].failedCount;				
					childWorkflows[entry.dispatchId] = {schedule:true,args:entry.args, name:entry.name,class:entry.class,failedCount};
					break;
				case 'StartChildWorkflow':
					childWorkflows[entry.dispatchId].started = true;
					break;
				case 'FailedChildWorkflow':
					childWorkflows[entry.dispatchId].failed = true;
					if(!childWorkflows[entry.dispatchId].failedCount){
						childWorkflows[entry.dispatchId].failedCount=1;
					}
					else 
						childWorkflows[entry.dispatchId].failedCount++;
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
				case 'WorkflowStarted':
					parent = entry;
					break;
				case 'ContinueAsNew':
					childWorkflows[entry.dispatchId] = {schedule:true,args:entry.args, name:entry.name,class:entry.class};
					break;
				case 'WorkflowComplete':
					// release waiting callbacks
					// needANewDecisionTask = false;										
					// taint parent					
					logger.info("WorkflowComplete " + workflowId);
					if(parent && parent.parent){
	    				var parentJournal = journalService.getJournal(parent.parent);
						// var classFn = workflowFactory[entry.class];
						// console.log(classFn ,childWorkflow.class)
						// var instance = new classFn(entry.parent);
						// instance.parentWorkflow = workflowId;
						await parentJournal.append({type:"FinishedChildWorkflow", date: entry.date, result:entry.result, dispatchId:entry.id});
						// await instance.scheduler.taint();
						await taint({workflowId:parent.parent});						
						return;
					}
					// await journal.clear();
					break;
				case 'WorkflowFailed':
					// release waiting callbacks
					// needANewDecisionTask = false;										
					// taint parent
					// console.log("parent",parent);
					logger.warn("Taint - FailedChildWorkflow " + workflowId);
					if(parent && parent.parent){
	    				// console.log(parent.parent);
						// discover parent
	    				var parentJournal = journalService.getJournal(parent.parent);
						// var classFn = workflowFactory[parent.class];
						// console.log(classFn ,childWorkflow.class)
						// var instance = new classFn(parent.parent);
						// instance.parentWorkflow = workflowId;
						await parentJournal.append({type:"FailedChildWorkflow", date: entry.date, result:entry.result, dispatchId:workflowId});
						await taint({workflowId:parent.parent});
						return;
					}
					break;					
			}
		}
		if(lastDecisionTaskState === 'started' && moment().diff(moment(lastDecisionTaskDate).utc(), 'minutes') > 5){
			await journal.append({type:"DecisionTaskTimeOut", date: new Date()});
			logger.warn("Taint - DecisionTaskTimeOut " + workflowId);
			await taint({workflowId});
			return;
		}

		var tasksIds = Object.keys(tasks);
		for(var i = 0; i < tasksIds.length; i++){
			var taskId = tasksIds[i];
			var task = tasks[taskId];			
		    var state = await activityStateFromHistory(taskId,journal);	
		    logger.debug("activity state:",task,taskId);
			if(task.schedule && !task.started){
				logger.debug("scheduled but not started");
				if(task.failedCount > 5){
					// fail entire workflow
      				await journal.append({type:"WorkflowFailed", date: new Date(), result:'task ' + taskId + ' failed' });
					await taint({workflowId});
					continue;
				}
				else{
					logger.debug("put job",taskId);
					await activityTasks.putJob({workflowId,taskId});
				}
			}
			else if(state.started){					
	      		if(moment().diff(moment(state.last_activity).utc(), 'minutes') > 5){
	      			// handle timeout
	      			logger.info("TimedOutActivity");
      				await journal.append({type:"TimedOutActivity", date: new Date(),dispatchId:taskId});
      				needANewDecisionTask=true;
					// throw new WorkflowDecisionScheduleActivity("HeartBeeat");
	      		}
			}
		}

		var childWorkflowsIds = Object.keys(childWorkflows);
		for(var i = 0; i < childWorkflowsIds.length; i++){
			var childWorkflowId = childWorkflowsIds[i];
			var childWorkflow = childWorkflows[childWorkflowId];
			var childJournal = journalService.getJournal(childWorkflowId);						
			var state = await workflowStateFromHistory(childJournal);
			// logger.debug("wf state:",childWorkflowId,state,childWorkflow.failedCount);
			if(childWorkflow.failed && childWorkflow.failedCount > 5){
				// fail entire workflow
  				await journal.append({type:"WorkflowFailed", date: new Date(), result:'workflow ' + childWorkflowId + ' failed' });
  				logger.warn("failing workflow:",workflowId);
				await taint({workflowId});
				return;
			}	
			if(childWorkflow.schedule && !childWorkflow.started){
							
				// create a new workflow
				// console.log("childWorkflow",childWorkflowId,childWorkflow);				
				var classFn = workflowFactory[childWorkflow.class];

				// console.log(classFn ,childWorkflow.class)
				var instance = new classFn(childWorkflowId);
				instance.parentWorkflow = workflowId;
				
				// TODO: need to enable for retries
				// await instance.journal.clear();
				logger.info("start child workflow " + childWorkflowId);
		  		await journal.append({type:"StartChildWorkflow", date: new Date(), dispatchId:childWorkflowId,class:childWorkflow.class,name:childWorkflow.name});
		  		// try{	  
					// instance.innerDispatch = true;
					// await instance[childWorkflow.name](...Object.values(childWorkflow.args));				  	
					await instance.journal.append({type:"WorkflowStarted", date: new Date(), args:childWorkflow.args, name:childWorkflow.name, class:childWorkflow.class, parent:workflowId});
				  	await instance.journal.append({type:"DecisionTaskSchedule", date: new Date()});
					await decisionTasks.putJob({workflowId:childWorkflowId});
					// console.log("res", res);
      				// instance.journal.append({type:"WorkflowComplete", date: new Date(), result:res,name:childWorkflow.name,class:childWorkflow.class,id:childWorkflowId,parent:this.workflowId});

					// this.journal.append({type:"FinishedChildWorkflow", date: new Date(), result:res, dispatchId:childWorkflowId});
					// instance.scheduler.taint();
					// this.taint();
			  		// needANewDecisionTask = true;
			  		// throw new WorkflowNoDecision();
		  		// }
		  		// catch(e){
		  		// 	if(e instanceof WorkflowDecision){
		  		// 		// this.taint();
		  		// 		// needANewDecisionTask = true;
						// if(e instanceof WorkflowNoDecision){
				  //   	}
				  //   	if (e instanceof WorkflowDecisionScheduleActivity) {
				  //   		// add to journal
				  //   		await instance.journal.append({type:"ScheduleActivity", date: new Date(), dispatchId:e.dispatchId, args:e.args,name:e.name});
				  //   	}
				  //   	else if(e instanceof WorkflowDecisionScheduleWorkflow){
				  //   		// add to journal
				  //   		await instance.journal.append({type:"ScheduleChildWorkflow", date: new Date(), dispatchId:e.dispatchId, args:e.args,name:e.name,class:e.class});
				  //   	}
				  //   	else if(e instanceof WorkflowTimerDecision){
				  //   		await instance.journal.append({type:"TimerSetup", date: new Date(),timerId:e.timerId,duration:e.duration});
				  //   		await instance.scheduler.scheduleTimer(e.duration,e.timerId);
				  //   	}				    	
				  //   	// current decisionTask execution id
				  //   	// this.journal.append({type:"DecisionTaskComplete", date: new Date()});
						// // notify scheduler		
				  //   	// this.scheduler.taint();		  				
		  		// 		// throw e;
		  		// 	}
		  		// 	else{	  				
		  		// 		logger.error("Child Workflow Failed",e);
			  	// 		await journal.append({type:"FailedChildWorkflow", date: new Date(), error:e, dispatchId:childWorkflowId});
			  	// 		await this.taint({workflowId});
			  	// 		needANewDecisionTask = true;
		  		// 	}
		  		// }
				// run using mainDispatch

			}
			else if(!childWorkflow.finished && !childWorkflow.failed ){
				if(moment().diff(moment(state.last_activity).utc(), 'minutes') > 5){
	      			// handle timeout
	      			// logger.info("TimedOutActivity");
	      			// logger.info("TimedOutWorkflow");
      				// await journal.append({type:"TimedOutChildWorkflow", date: new Date(),dispatchId:workflowId});
      				// needANewDecisionTask=true;
	      			await this.taint({workflowId:childWorkflowId});
      				// await journal.append({type:"TimedOutActivity", date: new Date(),dispatchId:taskId});	      			
      				// needANewDecisionTask=true;
					// throw new WorkflowDecisionScheduleActivity("HeartBeeat");
	      		}
				// logger.info("may need to taint workflow " + childWorkflowId);
				// await this.taint({workflowId:childWorkflowId});
			}
		}
		if(needANewDecisionTask){
		  	await journal.append({type:"DecisionTaskSchedule", date: new Date()});
			await decisionTasks.putJob({workflowId:workflowId});
		}
		logger.info("Done tainting " + workflowId);
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
	
}
var server = jayson.server(srv);

const http = server.http()
if(process.env.FJS_RECOVER === 'true'){
	srv.recover();
}

export default http;
