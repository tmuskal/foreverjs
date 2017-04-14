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


export {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision}