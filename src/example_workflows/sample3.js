import {workflowFactory, workflow, WorkflowController, activity} from '../index';

function delay(time) {
  return new Promise(function (fulfill) {   
    setTimeout(fulfill, time);
  });
}

class sample3 extends WorkflowController{
    @workflow()
    async start(seconds){        
        var secondsx2 = await this.sleepAndMultiply(seconds);
        var secondsx4 = await this.sleepAndMultiply(secondsx2);
        return await this.sleepAndMultiply(secondsx4);
    }
    @activity()
    async sleepAndMultiply(seconds){
        console.log('sleeping for',seconds, 'seconds');
        await delay(seconds * 1000)
        return seconds * 2;
    }
}
workflowFactory.sample3 = sample3;
export default sample3;

