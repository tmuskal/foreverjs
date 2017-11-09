const jayson = require('jayson/promise');
const moment = require("moment");
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision,WorkflowTimerDecision} from '../workflow_signals'
import JobQueueServer  from '../job_queue/client';
import workflowFactory from '../workflow_factory';
import journalService from '../journal/client';
import schedulerService from '../scheduler/client';
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
		logger.info("running " + id);
		return await workflow[name](...args);
	}
	catch(e){
		if (e instanceof WorkflowDecision) {
			await srv.taint({workflowId:id,recovery:true});
			return;
		}		
		logger.info('run failed',e);
		throw e;
	}		
}
async function taint({workflowId,recovery,external}){
	var scheduler;
	if(external){
		scheduler = schedulerService.getScheduler(workflowId);	
	}
	else 
		scheduler = srv;
	return await scheduler.taint({workflowId,recovery});
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
				return srv.taint({workflowId: j,recovery:true});
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
	taint: async function({workflowId,recovery}){
		var decisionTasks = JobQueueServer.getJobQueue("decisions");
		var activityTasks = JobQueueServer.getJobQueue("activities");
	    var journal = journalService.getJournal(workflowId);
	    var parent;
		var entries = await journal.getEntries();		
	    if(entries.find(e=>e.type === 'Archive'))
			return;
		if(entries.length >0 && entries[entries.length-1].type === 'Taint'){
			if(moment().diff(moment(entries[entries.length-1].date).utc(), 'seconds') < 25){
				// logger.debug('skip duplicate taint',workflowId);
				return;				
			}
		}
		await journal.append({type:"Taint", date: new Date(),entries_count:entries.length,recovery});		
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
				case "QueueActivity":
					if(!recovery)
						tasks[entry.dispatchId].queued = true;
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
					tasks[entry.dispatchId].queued = false;
					break;					
				case "DecisionTaskSchedule":
					lastDecisionTaskState = "schedule";
					if(!recovery){
						needANewDecisionTask = false;
					}
					break;
				case "DecisionTaskQueued":
					if(!recovery){
						lastDecisionTaskState = "queue";
						lastDecisionTaskDate = entry.date;
						needANewDecisionTask = false;						
					}
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
					var finished = false;
					if(childWorkflows[entry.dispatchId]){
						failedCount = childWorkflows[entry.dispatchId].failedCount;
						finished = childWorkflows[entry.dispatchId].finished;
					}
					if(!finished)
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
						await taint({workflowId:parent.parent,recovery});						
						await journal.append({type:"Archive", date: new Date()});
					}
					return;
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
						await taint({workflowId:parent.parent,recovery});
						await journal.append({type:"Archive", date: new Date()});
					}
					return;
					break;					
			}
		}
		if(lastDecisionTaskState === 'start' && moment().diff(moment(lastDecisionTaskDate).utc(), 'minutes') > 5){
			await journal.append({type:"DecisionTaskTimeOut", date: new Date()});
			logger.warn("Taint - DecisionTaskTimeOut " + workflowId);
			await taint({workflowId,recovery});
			return;
		}

		var tasksIds = Object.keys(tasks);
		for(var i = 0; i < tasksIds.length; i++){
			var taskId = tasksIds[i];
			var task = tasks[taskId];			
		    if(task.finished)
		    	continue;
		    if(task.queued)
		    	continue;		    
			logger.debug("activity state:",task,taskId);
		    var state = await activityStateFromHistory(taskId,journal,entries);	
			if(task.schedule && !task.started){
				if(task.failedCount > process.env.TASK_RETRY_COUNT){
					// fail entire workflow
					logger.debug("task failed 5 time. failing workflow", workflowId);
      				await journal.append({type:"WorkflowFailed", date: new Date(), result:'task ' + taskId + ' failed' });
					await taint({workflowId,recovery});
					return;
				}
				else{
					await journal.append({type:"QueueActivity", date: new Date(), dispatchId:taskId});
					await activityTasks.putJob({workflowId,taskId});
				}
			}
			else if(state.started){					
	      		if(moment().diff(moment(state.last_activity).utc(), 'minutes') > process.env.ACTIVITY_HEARTBEAT_TIMEOUT){
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
			if(childWorkflow.finished)
		    	continue;
			var childJournal = journalService.getJournal(childWorkflowId);						
			// var state = await workflowStateFromHistory(childJournal);
			var state = await activityStateFromHistory(childWorkflowId,journal,entries);
			logger.debug("wf state:",childWorkflowId,childWorkflow.finished,state.last_activity);
			if(childWorkflow.failed && childWorkflow.failedCount > WORKFLOW_RETRY_COUNT){
				// fail entire workflow
  				await journal.append({type:"WorkflowFailed", date: new Date(), result:'workflow ' + childWorkflowId + ' failed' });
  				logger.warn("failing workflow:",workflowId);
				await taint({workflowId,recovery});
				return;
			}	
			if(childWorkflow.schedule && !childWorkflow.started){
							
				// create a new workflow
				// console.log("childWorkflow",childWorkflowId,childWorkflow);				
				var classFn = workflowFactory[childWorkflow.class];

				// console.log(classFn ,childWorkflow.class)
				// var instance = new classFn(childWorkflowId);
				// instance.parentWorkflow = workflowId;
				
				// TODO: need to enable for retries
				await childJournal.clear();		
				// await delay(1000);
				logger.info("start child workflow " + childWorkflowId);
		  		await journal.append({type:"StartChildWorkflow", date: new Date(), dispatchId:childWorkflowId,class:childWorkflow.class,name:childWorkflow.name});
		  		// try{	  
					// instance.innerDispatch = true;
					// await instance[childWorkflow.name](...Object.values(childWorkflow.args));				  	
					await childJournal.append({type:"WorkflowStarted", date: new Date(), args:childWorkflow.args, name:childWorkflow.name, class:childWorkflow.class, parent:workflowId});
				  	await childJournal.append({type:"DecisionTaskSchedule", date: new Date()});
				  	await childJournal.append({type:"DecisionTaskQueued", date: new Date()});
					await decisionTasks.putJob({workflowId:childWorkflowId});

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
				if(recovery || moment().diff(moment(state.last_activity).utc(), 'minutes') > process.env.CHILD_WORKFLOW_HEARTBEAT_TIMEOUT){
	      			// handle timeout
	      			// logger.info("TimedOutActivity");
	      			// logger.info("TimedOutWorkflow - tainting", childWorkflowId);
      				// await journal.append({type:"TimedOutChildWorkflow", date: new Date(),dispatchId:workflowId});
      				// needANewDecisionTask=true;
	      			await taint({workflowId:childWorkflowId,recovery});
      				// await journal.append({type:"TimedOutActivity", date: new Date(),dispatchId:taskId});	      			
      				// needANewDecisionTask=true;
					// throw new WorkflowDecisionScheduleActivity("HeartBeeat");
	      		}
				// logger.info("may need to taint workflow " + childWorkflowId);
				// await this.taint({workflowId:childWorkflowId});
			}
		}
		if((needANewDecisionTask && lastDecisionTaskState !== 'queue') || recovery){
		  	await journal.append({type:"DecisionTaskSchedule", date: new Date()});
		  	await journal.append({type:"DecisionTaskQueued", date: new Date()});
			await decisionTasks.putJob({workflowId});
		}
		logger.debug("Done tainting " + workflowId);
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
