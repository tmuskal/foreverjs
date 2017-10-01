import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision,WorkflowTimerDecision,WorkflowDecisionContinueAsNew} from '../workflow_signals'
import journalService from '../journal/client';

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
	      const theFunc = async function(){
		  	// if main dispatch, mark main dispatch false and run		  	 
		  	if(this.mainRun){

		  		this.mainRun = false;
		  		await this.journal.append({type:"DecisionTaskStarted", date: new Date()});
			  	try{
		      		var res = await value.call(this,...arguments);
			    	await this.journal.append({type:"DecisionTaskComplete", date: new Date()});
			    	var parent = (await this.journal.getEntries()).find(e=>e.type === 'WorkflowStarted').parent;
      				await this.journal.append({type:"WorkflowComplete", date: new Date(), result:res,name:name,class:this.constructor.name,id:this.workflowId,parent});
      				
		    		// notify scheduler
		    		await this.scheduler.taint();
			  	}
			  	catch(e){
			  		// console.log(e);
				    if (e instanceof WorkflowDecision) {
				    	if(e instanceof WorkflowNoDecision){
				    	}
				    	if (e instanceof WorkflowDecisionScheduleActivity) {
				    		// add to journal
				    		await this.journal.append({type:"ScheduleActivity", date: new Date(), dispatchId:e.dispatchId, args:e.args,name:e.name});
				    	}
				    	else if(e instanceof WorkflowDecisionScheduleWorkflow){
				    		// add to journal
				    		await this.journal.append({type:"ScheduleChildWorkflow", date: new Date(), dispatchId:e.dispatchId, args:e.args,name:e.name,class:e.class});
				    	}
				    	else if(e instanceof WorkflowTimerDecision){
				    		await this.journal.append({type:"TimerSetup", date: new Date(),timerId:e.timerId,duration:e.duration});
				    		await this.scheduler.scheduleTimer(e.duration,e.timerId);
				    	}
				    	else if (e instanceof WorkflowDecisionContinueAsNew){
				    		await this.journal.append({type:"ContinueAsNew", date: new Date(),args:e.args,name:name,class:this.constructor.name,dispatchId:this.workflowId + "_1"});
				    	}

				    	// current decisionTask execution id
				    	await this.journal.append({type:"DecisionTaskComplete", date: new Date()});
						// notify scheduler		
				    	await this.scheduler.taint();
						// complete decision task
				    	return e;
				        // statements to handle TypeError exceptions
				    } else {
				    	console.log('real error',e);
				    	// mark failed
				    	await this.journal.append({type:"DecisionTaskFailed", date: new Date(),error:e});
						// notify scheduler		
						await this.scheduler.taint();
				    	throw e;
				    }
			  	}		  		
		  	}
		  	else if(this.mainDispatch){
		  		// from test and api gateway.
		  		this.mainDispatch = false;
		  		var state = await this.workflowStateFromHistory();
		  		if(state.finished){
		  			return state.result;
		  		}		  		
		  		if(state.failed){
		  			throw state.result;
		  		}		  		
		  		if(state.notFound){
      				await this.journal.append({type:"WorkflowStarted", date: new Date(), args:arguments, name, class:this.constructor.name, parent:this.parentWorkflow});
		  			await this.scheduler.taint();
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
		  		var state = await this.workflowStateFromHistory();
		  		// console.log("state3",state);
		  		if(state.finished){
		  			return state.result;
		  		}		  		
		  		if(state.failed){
		  			throw state.result;
		  		}		  				  		
		  		if(state.notFound){
      				await this.journal.append({type:"WorkflowStarted", date: new Date(), args:arguments, name, class:this.constructor.name, parent:this.parentWorkflow});
		  			await this.scheduler.taint();
		  			throw new WorkflowNoDecision();
		  		}
		  		if(state.started){
		  			throw new WorkflowNoDecision();
		  		}
		  	}
		  	else{		  				  		
		  		// child workflow
	      		var dispatchId = this.newDispatchID();	   
	      		var entries = await journalService.getJournal(dispatchId).getEntries();
		      	var parent = entries.find(e=>e.type === 'WorkflowStarted'); 
		      	if(parent)
		      		parent = parent.parent;		      	
		      	var state = await this.stateFromHistory(dispatchId, journalService.getJournal(parent || dispatchId));
		      	// console.log("state2",state, dispatchId,this.workflowId,parent);
		      	if(state.notFound){
		      		throw new WorkflowDecisionScheduleWorkflow(dispatchId,name,arguments,this.constructor.name);
		      	}
		  		if(state.failed){
		      		throw new WorkflowDecisionScheduleWorkflow(dispatchId,name,arguments,this.constructor.name);

		  			// throw state.result;
		  		}
		      	if(state.finished){
		      		return state.result;
		      	}
		      	throw new WorkflowNoDecision();

		  		// else, find id in journal and see if need to redispatch or return existing result.
		  		// throw new Error("not implemented");
		  	}
	      };
	      // Process the function	      
		  newDescriptor.value = theFunc.bind(this);
	      // Redfine it on the instance with the new descriptor
	      Object.defineProperty(this, name, newDescriptor);

	      // Return the processed function
	      return newDescriptor.value;
	    }
	  };  	
    
   }
}
export default workflow;