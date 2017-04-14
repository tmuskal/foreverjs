const jayson = require('jayson/promise');
import journalService from './journal_service';
import Scheduler from './journal_service';
import WorkflowController from './workflow_controller';
import workflow from './annotations/workflow';
import activity from './annotations/activity';
import humanActivity from './annotations/human_activity';
import Worker from './worker';
import workflowFactrory from './workflow_factory';

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
	@humanActivity()
	doReadFilledForm(resultFile){
		return {
			prepare: () => {}, // put form online, notify (open ticket), can fall back to default 
			process: () => {} // after received completion signal. can fall back to default
		}
	}
}
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

// in worker
workflowFactrory.sample = sample;
workflowFactrory.sample2 = sample2;
const worker = new Worker();
var dummy = new sample("");
worker.PeriodicDoDecisionTask(dummy.scheduler.decisionTasks);
worker.PeriodicDoActivityTask(dummy.scheduler.activityTasks);


// dispatcher
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

// todo: add scheduler - with api
// todo: gateway
// todo: parallel jobs
// todo: external journal server
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