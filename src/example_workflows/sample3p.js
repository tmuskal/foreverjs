import {workflowFactory, workflow, WorkflowController, activity,lambdaActivity} from '../index';

function delay(time) {
  return new Promise(function (fulfill) {   
    setTimeout(fulfill, time);
  });
}

class sample3p extends WorkflowController{
    @workflow()
    async start(seconds){        
        console.log("fetched_paged",fetched_paged);
        var secondsx2 = await this.parallel_do([seconds,seconds*1.2],this.sleepAndMultiply);
        var secondsx4 = await this.parallel_do(secondsx2,this.sleepAndMultiply);
        var secondsx8 = await this.parallel_do(secondsx4,this.sleepAndMultiply);                
        return secondsx8[0];
    }
    @activity()
    async sleepAndMultiply(seconds){
        console.log('sleeping for',seconds, 'seconds');
        await delay(seconds * 1000)
        return seconds * 2;
    }
}
workflowFactory.sample3p = sample3p;
export default sample3p;

