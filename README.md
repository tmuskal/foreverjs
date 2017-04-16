```javascript
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
```