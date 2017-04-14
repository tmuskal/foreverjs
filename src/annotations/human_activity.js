import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from '../workflow_signals'

function humanActivity() {
   return function decorator(target, name, descriptor) {
	// console.log("workflow init", value,target, name);
  	let {value, get} = descriptor;  	  
	target.isHumanActivity = true;
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
          // console.log("getting",this, value);

	      // Process the function
	      newDescriptor.value = function(){
	      	return value.call(this,...arguments);
	      };

	      // Redfine it on the instance with the new descriptor
	      Object.defineProperty(this, name, newDescriptor);

	      // Return the processed function
	      return newDescriptor.value;
	    }
	  };  	
    
   }

}

export default humanActivity;