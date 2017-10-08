import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from '../workflow_signals'
const moment = require("moment");
const AWS = require("aws-sdk");
var lambda = new AWS.Lambda({apiVersion: '2015-03-31',region:"us-west-2"});

import logger from '../logger';


function lambdaActivity(functionName) {
   return function decorator(target, name, descriptor) {
  	let {value, get} = descriptor;  	  
	target.isActivity = true;
	  return {
	    get: function getter() {
	      const newDescriptor = { configurable: true };

	      // If we are dealing with a getter
	      if (get) {
	        // Replace the getter with the processed one
	        // newDescriptor.get = function(){
	        // 	console.log("activity_getter inner",this);
        	// 	return get();
	        // };

	        // Redefine the property on the instance with the new descriptor
	        Object.defineProperty(this, name, newDescriptor);

	        // Return the getter result
	        return newDescriptor.get();
	      }
	      const theFunc = async function(){	      	
	      	if(this.activityMode){
	      		logger.debug("invoking lambda", functionName);
				 return await lambda.invoke({
				  FunctionName: functionName, 
				  Payload: JSON.stringify(arguments), 
				 }).promise().then(res=>{				 	
				 	const payload = JSON.parse(res.Payload);
				 	if(payload.errorMessage){
				 		throw new Error(payload.errorMessage);
				 	}
				 	else return payload;
				 });
	      	}
	      	else{
		      	// give a canonical id - workflowid + internal activity counter
	      		var dispatchId = this.newDispatchID();

		      	var state = await this.stateFromHistory(dispatchId);
		      	// logger.debug("state.started",state.started)
		      	if(state.finished){
		      		return state.result;
		      	}
		      	if(state.notFound){
		      		throw new WorkflowDecisionScheduleActivity(dispatchId, name, arguments);
		      	}
		      	if(state.failed){
		      		// raise failed - let controller reschedule if needed.
		      		throw new WorkflowDecisionScheduleActivity(dispatchId, name, arguments);
		      	}
		      	if(state.timedOut){
		      		// not used?
					throw new WorkflowDecisionScheduleActivity(dispatchId, name, arguments);
		      	}		      	
		      	if(state.scheduled){
		      		throw new WorkflowNoDecision();
		      	}
		      	if(state.started){

		      		throw new WorkflowNoDecision();
		      	}		      	
	      	}
	      	
	      };
	      // Process the function
	      newDescriptor.value = theFunc.bind(this);

	      // Redfine it on the instance with the new descriptor
	      Object.defineProperty(this, name, newDescriptor);

	      // Return the processed function
	      return newDescriptor.value
	    }
	  };  	
    
   }

}

export default lambdaActivity;
