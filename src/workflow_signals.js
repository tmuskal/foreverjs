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

class WorkflowDecisionMultipleDecisions extends WorkflowDecision{
	constructor(decisions){
		super()
		this.decisions = decisions;
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

class WorkflowDecisionActivityTimeout extends WorkflowDecision{
	constructor(type){
		super()
		this.type = type;
	}
}

class WorkflowDecisionWorkflowTimeout extends WorkflowDecision{
	constructor(type){
		super()
		this.type = type;
	}
}


class WorkflowDecisionContinueAsNew extends WorkflowDecision{
	constructor(args){
		super()
		this.args = args;
	}
}


export {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision,WorkflowTimerDecision,WorkflowDecisionContinueAsNew,WorkflowDecisionMultipleDecisions}