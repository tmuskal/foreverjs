import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from './workflow_signals'
import JobQueue  from './job_queue';
import workflowFactrory from './workflow_factory';
var decisionTasks = new JobQueue();
var activityTasks = new JobQueue();

class Scheduler{
	constructor(workflowId,journalService){
		this.workflowId = workflowId;
		this.journal = journalService.getJournal(workflowId);
		this.decisionTasks = decisionTasks;
		this.activityTasks = activityTasks;
	}
	taint(){
		var entries = this.journal.getEntries();
		// console.log("journal",entries);
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
						var classFn = workflowFactrory[entry.class];
						// console.log(classFn ,childWorkflow.class)
						var instance = new classFn(entry.parent);
						instance.parentWorkflow = this.workflowId;
						instance.innerDispatch = true;
						instance.journal.append({type:"FinishedChildWorkflow", date: new Date(), result:entry.result, dispatchId:entry.id});
						instance.scheduler.taint();
					}
					else{
						// console.log("result",this.workflowId,entry.result);
					}
					break;
			}
		}
		var tasksIds = Object.keys(tasks);
		for(var i = 0; i < tasksIds.length; i++){
			var taskId = tasksIds[i];
			var task = tasks[taskId];
			if(task.schedule && !task.started){
				this.activityTasks.putJob({workflowId:this.workflowId,taskId});
			}
		}

		var childWorkflowsIds = Object.keys(childWorkflows);
		for(var i = 0; i < childWorkflowsIds.length; i++){
			var childWorkflowId = childWorkflowsIds[i];
			var childWorkflow = childWorkflows[childWorkflowId];
			if(childWorkflow.schedule && !childWorkflow.started){
				// create a new workflow
				// console.log("childWorkflow",childWorkflowId,childWorkflow);				
				var classFn = workflowFactrory[childWorkflow.class];

				// console.log(classFn ,childWorkflow.class)
				var instance = new classFn(childWorkflowId);
				instance.parentWorkflow = this.workflowId;
				instance.innerDispatch = true;

		  		this.journal.append({type:"StartChildWorkflow", date: new Date(), dispatchId:childWorkflowId,class:childWorkflow.class,name:childWorkflow.name});
		  		try{	  			
					var res = instance[childWorkflow.name](...childWorkflow.args);

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
				    		instance.journal.append({type:"ScheduleActivity", date: new Date(), dispatchId:e.dispatchId, args:e.args,name:e.name});
				    	}
				    	else if(e instanceof WorkflowDecisionScheduleWorkflow){
				    		// add to journal
				    		instance.journal.append({type:"ScheduleChildWorkflow", date: new Date(), dispatchId:e.dispatchId, args:e.args,name:e.name,class:e.class});
				    	}
				    	// current decisionTask execution id
				    	// this.journal.append({type:"DecisionTaskComplete", date: new Date()});
						// notify scheduler		
				    	// this.scheduler.taint();		  				
		  				// throw e;
		  			}
		  			else{	  				
			  			this.journal.append({type:"FailedChildWorkflow", date: new Date(), error:e, dispatchId:childWorkflowId});
			  			needANewDecisionTask = true;
		  			}
		  		}
				// run using mainDispatch

			}
		}
		if(needANewDecisionTask){
		  	this.journal.append({type:"DecisionTaskSchedule", date: new Date()});	
			this.decisionTasks.putJob({workflowId:this.workflowId});
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
	// 
}


export default Scheduler;