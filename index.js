class Journal{
	constructor(id){
		this.entries = [];
		this.id = id;
	}
	getEntries(){
		return this.entries;
	}	
	append(entry){
		// console.log("journal:",this.id,entry);
		this.entries.push(entry);
	}
}
class JournalService{
	constructor(){
		this.journals = {};
	}
	getJournal(id){
		var journal = this.journals[id];
		if(!journal){			
			this.journals[id] = journal = new Journal(id);
		}
		return journal;
	}	
}
class JobQueue {
	constructor(){
		this.innerQueue = [];
	}
	putJob(job){
		this.innerQueue.push(job);
	}
	getJob(cb){
		if(this.innerQueue.length){
			var res= this.innerQueue.pop();
			cb(res);
		}
		else{
			setTimeout(this.getJob.bind(this),100,cb);
		}
	}
}

var journalService = new JournalService();
var decisionTasks = new JobQueue();
var activityTasks = new JobQueue();
class Scheduler{

	constructor(workflowId){
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
						var classFn = eval(entry.class);
						// console.log(classFn ,childWorkflow.class)
						var instance = classFn(entry.parent);
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
				var classFn = eval(childWorkflow.class);
				// console.log(classFn ,childWorkflow.class)
				var instance = classFn(childWorkflowId);
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

function workflowController(journalService) {
   return function decorator(target) {
	return function(){
	      	var newInstance =  new target(...arguments);
	      	newInstance.isWorkflowController = true;
	      	newInstance.journalService = journalService;	      	
	      	return newInstance;
	      };
   }
}
function workflowStateFromHistory(journal){
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
function stateFromHistory(journal, dispatchId){
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

function workflow() {
   return function decorator(target, name, descriptor) {
	// console.log("workflow init", value,target, name);
  	let {value, get} = descriptor;  	  
	target.isWorkflow = true;
	  return {
	    get: function getter() {
	      const newDescriptor = { configurable: true };

	      // If we are dealing with a getter
	      if (get) {
	        // Replace the getter with the processed one

	        // Redefine the property on the instance with the new descriptor
	        Object.defineProperty(this, name, newDescriptor);

	        // Return the getter result
	        return newDescriptor.get();
	      }

	      // Process the function
		  newDescriptor.value = function(){
		  	
		  	// if main dispatch, mark main dispatch false and run		  	 
		  	if(this.mainRun){
		  		this.mainRun = false;
		  		this.journal.append({type:"DecisionTaskStarted", date: new Date()});
			  	try{
		      		var res = value.call(this,...arguments);
			    	this.journal.append({type:"DecisionTaskComplete", date: new Date()});
			    	var parent = this.journal.getEntries().find(e=>e.type === 'WorkflowStarted').parent;
      				this.journal.append({type:"WorkflowComplete", date: new Date(), result:res,name:name,class:this.constructor.name,id:this.workflowId,parent});
		    		// notify scheduler
		    		this.scheduler.taint();
			  	}
			  	catch(e){
			  		// console.log(e);
				    if (e instanceof WorkflowDecision) {
				    	if(e instanceof WorkflowNoDecision){
				    	}
				    	if (e instanceof WorkflowDecisionScheduleActivity) {
				    		// add to journal
				    		this.journal.append({type:"ScheduleActivity", date: new Date(), dispatchId:e.dispatchId, args:e.args,name:e.name});
				    	}
				    	else if(e instanceof WorkflowDecisionScheduleWorkflow){
				    		// add to journal
				    		this.journal.append({type:"ScheduleChildWorkflow", date: new Date(), dispatchId:e.dispatchId, args:e.args,name:e.name,class:e.class});
				    	}
				    	// current decisionTask execution id
				    	this.journal.append({type:"DecisionTaskComplete", date: new Date()});
						// notify scheduler		
				    	this.scheduler.taint();
						// complete decision task
				    	return e;
				        // statements to handle TypeError exceptions
				    } else {
				    	console.log('real error',e);
				    	// mark failed
				    	this.journal.append({type:"DecisionTaskFailed", date: new Date(),error:e});
						// notify scheduler		
						this.scheduler.taint();
				    	throw e;
				    }
			  	}		  		
		  	}
		  	else if(this.mainDispatch){
		  		// from test and api gateway.
		  		this.mainDispatch = false;
		  		var state = workflowStateFromHistory(this.journal);
		  		// console.log("state",state);
		  		if(state.finished){
		  			return state.result;
		  		}		  		
		  		if(state.notFound){
      				this.journal.append({type:"WorkflowStarted", date: new Date(), args:arguments, name, class:this.constructor.name, parent:this.parentWorkflow});
		  			this.scheduler.taint();
		  			throw new WorkflowNoDecision();
		  		}
		  		if(state.started){
		  			throw new WorkflowNoDecision();
		  		}
	      		
		  		// convert to future
		  	}
		  	else if(this.innerDispatch){
		  		// from test and api gateway.
		  		// write to journal
		  		// this.innerDispatch = false;
		  		var state = workflowStateFromHistory(this.journal);
		  		// console.log("state3",state);
		  		if(state.finished){
		  			return state.result;
		  		}		  		
		  		if(state.notFound){
      				this.journal.append({type:"WorkflowStarted", date: new Date(), args:arguments, name, class:this.constructor.name, parent:this.parentWorkflow});
		  			this.scheduler.taint();
		  			throw new WorkflowNoDecision();
		  		}
		  		if(state.started){
		  			throw new WorkflowNoDecision();
		  		}
		  	}
		  	else{		  				  		
		  		// child workflow
	      		var dispatchId = this.newDispatchID();	   
		      	var parent = journalService.getJournal(dispatchId).getEntries().find(e=>e.type === 'WorkflowStarted'); 
		      	if(parent)
		      		parent = parent.parent;
		      	var state = stateFromHistory(journalService.getJournal(parent || dispatchId), dispatchId);
		      	// console.log("state2",state, dispatchId,this.workflowId,parent);
		      	if(state.notFound){
		      		throw new WorkflowDecisionScheduleWorkflow(dispatchId,name,arguments,this.constructor.name);
		      	}
		      	if(state.finished){
		      		return state.result;
		      	}
		      	throw new WorkflowNoDecision();

		  		// else, find id in journal and see if need to redispatch or return existing result.
		  		// throw new Error("not implemented");
		  	}
	      };
	      // Redfine it on the instance with the new descriptor
	      Object.defineProperty(this, name, newDescriptor);

	      // Return the processed function
	      return newDescriptor.value;
	    }
	  };  	
    
   }
}
// var workflow = (callback, args, name, type) => {
//   console.log('Starting  ', type, name, callback);
//   var result = callback();
//   console.log('Ended: ', name);
//   return result;
// };
class WorkflowSignal{};
class WorkflowDecision extends WorkflowSignal{}
class WorkflowNoDecision extends WorkflowDecision{}
class WorkflowDecisionScheduleActivity extends WorkflowDecision{
	constructor(dispatchId,name,args){
		super()
		this.args = args;
		this.dispatchId= dispatchId;
		this.name = name;

	}
}
class WorkflowDecisionScheduleWorkflow extends WorkflowDecision{
	constructor(dispatchId,name,args,className){
		super()
		this.args = args;
		this.dispatchId= dispatchId;
		this.name = name;
		this.class = className;
	}
}
function activity() {

   return function decorator(target, name, descriptor) {
  	let {value, get} = descriptor;  	  
	target.isActivity = true;
	  return {
	    get: function getter() {
	      const newDescriptor = { configurable: true };

	      // If we are dealing with a getter
	      if (get) {
	        // Replace the getter with the processed one
	        // newDescriptor.get = function(){
	        // 	console.log("activity_getter inner",this);
        	// 	return get();
	        // };

	        // Redefine the property on the instance with the new descriptor
	        Object.defineProperty(this, name, newDescriptor);

	        // Return the getter result
	        return newDescriptor.get();
	      }

	      // Process the function
	      newDescriptor.value = function(){	      	
	      	if(this.activityMode){
				return value.call(this,...arguments);
				// write results in journal

	      	}
	      	else{
		      	// give a canonical id - workflowid + internal activity counter
	      		var dispatchId = this.newDispatchID();
		      	var state = stateFromHistory(this.journal, dispatchId);
		      	if(state.finished){
		      		return state.result;
		      	}
		      	if(state.notFound){
		      		throw new WorkflowDecisionScheduleActivity(dispatchId, name, arguments);
		      	}
		      	if(state.failed){
		      		throw new WorkflowDecisionScheduleActivity(dispatchId, name, arguments);
		      	}
		      	if(state.timedOut){
					throw new WorkflowDecisionScheduleActivity(dispatchId, name, arguments);		      		
		      	}		      	
		      	if(state.scheduled){
		      		throw new WorkflowNoDecision();
		      	}
		      	if(state.started){
		      		throw new WorkflowNoDecision();
		      	}		      	
	      	}
	      	
	      };

	      // Redfine it on the instance with the new descriptor
	      Object.defineProperty(this, name, newDescriptor);

	      // Return the processed function
	      return newDescriptor.value
	    }
	  };  	
    
   }

}
function humanActivity() {
   return function decorator(target, name, descriptor) {
	// console.log("workflow init", value,target, name);
  	let {value, get} = descriptor;  	  
	target.isHumanActivity = true;
	  return {
	    get: function getter() {
	      const newDescriptor = { configurable: true };

	      // If we are dealing with a getter
	      if (get) {
	        // Replace the getter with the processed one

	        // Redefine the property on the instance with the new descriptor
	        Object.defineProperty(this, name, newDescriptor);

	        // Return the getter result
	        return newDescriptor.get();
	      }
          console.log("getting",this, value);

	      // Process the function
	      newDescriptor.value = function(){
	      	return value.call(this,...arguments);
	      };

	      // Redfine it on the instance with the new descriptor
	      Object.defineProperty(this, name, newDescriptor);

	      // Return the processed function
	      return newDescriptor.value;
	    }
	  };  	
    
   }

}


class WorkflowController{
	constructor(workflowId, activityMode){
		this.workflowId = workflowId;
		this.lastDispatchId = 0;
		this.activityMode = activityMode;
		this.journal = journalService.getJournal(workflowId);
		this.scheduler = new Scheduler(workflowId);
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

@workflowController(journalService)
class sample extends WorkflowController{
	@workflow()
	doA(a){
		var x = a;
		this.a = 4;
		var b = this.doB(x);
		b = this.doB(b);
		var c = this.doReadFilledForm(a,b);
		var d= this.doA2(x);
		var wf2 = new sample2(this.newDispatchID());
		var e= wf2.doA3(x*2);
		return e;
	}
	@workflow()
	doA2(a){
		var x = a;
		var b = this.doB(x);
		return b;
	}	
	@activity()
	doB(n){
		return n * n;
	}
	@humanActivity
	doReadFilledForm(resultFile){
		return {
			prepare: () => {}, // put form online, notify (open ticket), can fall back to default 
			process: () => {} // after received completion signal. can fall back to default
		}
	}
}
@workflowController(journalService)
class sample2 extends WorkflowController{
	@workflow()
	doA3(a){
		var x = a;
		var b = this.doB5(x);
		return b;
	}	
	@activity()
	doB5(n){
		return n * n;
	}
}
function DoDecisionTask(job){
	// console.log("need to do decision for ", job);
	var journal = journalService.getJournal(job.workflowId);
	var params = journal.getEntries().find(e=>e.type == 'WorkflowStarted')	
	var classFn = eval(params.class);
	var instance = classFn(job.workflowId);
	instance.mainRun = true;	
	try{
		instance[params.name](...params.args);
	}
	catch(e){
		console.log(e);
	}
}
function DoActivityTask(job){
	// console.log("need to do ", job);	
	var journal = journalService.getJournal(job.workflowId);
	var params = journal.getEntries().find(e=>e.type == 'WorkflowStarted')
	var classFn = eval(params.class);
	var instance = classFn(job.workflowId);
	var dispatchId = job.taskId;
	var paramsActivity = journal.getEntries().find(e=>e.dispatchId == dispatchId);
	instance.activityMode = true;
	instance.journal.append({type:"StartedActivity", date: new Date(), dispatchId, args:paramsActivity.args,name:paramsActivity.name});
	try{
		var res = instance[paramsActivity.name](...paramsActivity.args)
		instance.journal.append({type:"FinishedActivity", date: new Date(), dispatchId, result: res});	
	}
	catch(e){
		instance.journal.append({type:"FailedActivity", date: new Date(), dispatchId, error:e});	
	}
	// console.log(instance.journal.getEntries());
	instance.scheduler.taint();
}
function PeriodicDoDecisionTask(queue){
	queue.getJob(function(job){
		DoDecisionTask(job)
		setTimeout(PeriodicDoDecisionTask,10,queue);
	});	
}
function PeriodicDoActivityTask(queue){
	queue.getJob(function(job){		
		DoActivityTask(job)
		setTimeout(PeriodicDoActivityTask,10,queue);
	});	
}

var dummy = new sample("");
PeriodicDoDecisionTask(dummy.scheduler.decisionTasks);
PeriodicDoActivityTask(dummy.scheduler.activityTasks);
function testSimple(){	
	try{
		var x = new sample("test1id");
		x.mainDispatch = true;
		var y = x.doA(5);
		console.log("y = ",y);

		return y;
	}
	catch(e){
		setTimeout(testSimple,1000);
	}
}
testSimple();

// todo: add scheduler
// todo: gateway
// todo: parallel jobs
// todo: external journal
// todo: workers
// handle decision task scheduling and journal
// todo: add current context
// todo: handle fails
// todo: handle children workflow
// todo: handle timers 
// todo: handle timeouts
// todo: handle signals
// todo: handle continue as new
// todo: handle humanActivities (task + wait for signal + task)
// todo: versioning
// todo: support promises
// todo: exports, register, package, deploy - jsforever, better name.
// todo: integrate with mesos/hadoop