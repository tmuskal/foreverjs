import {workflowFactrory, Worker, humanActivity,workflow, WorkflowController, activity} from '../src';
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from '../src/workflow_signals'
import journalService from '../src/journal/client';


class sample extends WorkflowController{
	@workflow()
	async doA(a){
		var x = a;
		this.a = 4;
		var b =  await this.doB(x);
		b = await this.doB(b);
		var c = await this.doReadFilledForm(a,b);
		var d= await this.doA2(x);
		var wf2 = new sample2(this.newDispatchID());
		var e= await wf2.doA3(x*2);
		return e;
	}
	@workflow()
	async doA2(a){
		var x = a;
		var b = await this.doB(x);
		return b;
	}	
	@activity()
	async doB(n){
		return n * n;
	}
	@humanActivity()
	doReadFilledForm(resultFile){
		return {
			prepare: async () => {}, // put form online, notify (open ticket), can fall back to default 
			process: async () => {} // after received completion signal. can fall back to default
		}
	}
}
class sample2 extends WorkflowController{
	@workflow()
	async doA3(a){
		var x = a;
		var b = await this.doB5(x);
		return b;
	}	
	@activity()
	async doB5(n){
		return n * n;
	}
}

// in worker and schduler
workflowFactrory.sample = sample;
workflowFactrory.sample2 = sample2;

import schedulerServer from '../src/scheduler/server';

const worker = new Worker();
worker.runAll();

function stopAll(){
	worker.stop = true;
	schedulerServer.close();
}

function delay(time) {
  return new Promise(function (fulfill) {
    setTimeout(fulfill, time);
  });
}
var dt = new Date();
// dispatcher (gateway - this is exposed in a remote client)
async function testSimple(){	
	try{
		var x = new sample("test1id-" + dt);
		x.mainDispatch = true;
		var y = await x.doA(5);
		console.log("y = ",y);
		setTimeout(stopAll,1000);
		return y;
	}
	catch(e){
		// console.log(e);
		if (e instanceof WorkflowDecision) {
			await delay(1000);
			return await testSimple();
		}
		throw e;
	}
}

async function testSimple2(){
	return await testSimple();
}
testSimple2();