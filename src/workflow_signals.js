class WorkflowSignal{};
class WorkflowDecision extends WorkflowSignal{}
class WorkflowNoDecision extends WorkflowDecision{}
class WorkflowTimerDecision extends WorkflowDecision{
	constructor(duration,timerId){
		super()
		this.duration = duration;
		this.timerId = timerId;

	}	
}
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
class WorkflowDecisionContinueAsNew extends WorkflowDecision{
	constructor(args){
		super()
		this.args = args;
	}
}


export {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision,WorkflowTimerDecision,WorkflowDecisionContinueAsNew}