import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from '../workflow_signals'
import journalService from '../journal_service';

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
		  		var state = this.workflowStateFromHistory();
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
		  		var state = this.workflowStateFromHistory();
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
		      	var state = this.stateFromHistory(dispatchId, journalService.getJournal(parent || dispatchId));
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
export default workflow;