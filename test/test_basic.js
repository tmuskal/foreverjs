import {workflowFactory, Worker, workflow, WorkflowController, activity} from '../src';
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from '../src/workflow_signals'
import journalService from '../src/journal/client';

class sample extends WorkflowController{
	@workflow()
	async doA(a){
		var x = a;
		this.a = 4;
		await this.sleep(2);
		var b =  await this.doB(x);
		b = await this.doB(b);
		var d= await this.doA2(x);
		var wf2 = new sample2(this.newDispatchID());
		var e= await wf2.doA3(x*2 + d);
		// await this.sleep(2);
		// await this.continueAsNew(a+1);
		return e;
	}
	@workflow()
	async doA2(a){
		var x = a;
		var res = await this.doHuman({
			prepare:this.prepare,
			process:this.process,
			id:'human 2',
			payload:5
		});
		var b= await this.doB(x);
		return res+b;
	}	
	fireSignal(n,id){
		console.log("firing ", id, n);
		this.scheduler.signal(id,n);
	}	
	@activity()
	async doB(n){
		return n * n;
	}

	@activity()
	async process(n,id){
		console.log("processing", n,id);
		return n * n;
	}

	@activity()
	async prepare(n,id){
		console.log("preparing", n , id);
		setTimeout(this.fireSignal.bind(this),5000,n,id);
		// do something
		return;
	}	
}

class sample2 extends WorkflowController{
	@workflow()
	async doA3(a){
		var x = a;
		var b = await this.doB5(x);
		var m = await this.waitForSignal("human 1");
		// var aa = await this.doX();
		return b;
	}	
	fireSignal(){
		this.scheduler.signal("human 1","hello");
	}
	@activity()
	async doB5(n){
		setTimeout(this.fireSignal.bind(this),2000)
		return n * n;
	}
	@activity()
	async doX(){
		console.log('doX')
		throw new Error('not working');
	}
}
var t =0;
class softwareDevelopment extends WorkflowController{
	@workflow()
	async newFeature({name}){
		var definitions = {};
		var i = 0;
		while(!definitions.results){
			var aname = name;
			i++;
			if(definitions.error){
				aname = definitions.error + ", " + name
			}
			definitions = await this.doHuman({
				prepare:this.prepare,
				process:this.process,
				id:'define_' + i,
				payload:aname
			});
		}
		// var aa = await this.doX();
		return definitions.results;
	}
	fireSignal(id){		
		t++;
		if(t > 5)
			this.scheduler.signal(id,"hello");
		else
			this.scheduler.signal(id,"hello2");
	}
	@activity()
	async process(n,id){
		if(n=="hello"){
			return {
				results: n
			}			
		}
		else return {
			error: "bad response"
		}
		return n;
	}

	@activity()
	async prepare(description,id){
		setTimeout(this.fireSignal.bind(this),2000,id)
		console.log('preparing',description);
	}

	@activity()
	async do(n){
	}

}

// in worker and schduler
workflowFactory.sample = sample;
workflowFactory.sample2 = sample2;
workflowFactory.softwareDevelopment = softwareDevelopment
import jobQueueServer from '../src/job_queue/server';
import journalServer from '../src/journal/server';
import schedulerServer from '../src/scheduler/server';
import worker from '../src/workers/server';
import schedulerClient from '../src/scheduler/client';

function stopAll(){
	worker.stop = true;
	journalServer.close();
	schedulerServer.close();
	jobQueueServer.close();
}

// dispatcher (gateway - this is exposed in a remote client)
async function testSimple3(){
	var dt = new Date();	
	var y = await schedulerClient.run({className:'softwareDevelopment',name:'newFeature',args:[{name:"new f1"}],id:'test1' + dt});
	console.log("y = ",y);
	stopAll();
}
async function testSimple2(){
	var dt = new Date();	
	var y = await schedulerClient.run({className:'sample',name:'doA',args:[5],id:'test1' + dt});
	console.log("y = ",y);
	stopAll();
}
// testSimple2().catch((err)=>console.log('got error', err));
testSimple3().catch((err)=>console.log('got error', err));