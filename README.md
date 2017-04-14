```javascript
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
```