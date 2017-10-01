import {workflowFactory, workflow, WorkflowController, activity} from '../index';

function delay(time) {
  return new Promise(function (fulfill) {   
    setTimeout(fulfill, time);
  });
}

class sample3 extends WorkflowController{
    @workflow()
    async start(a){
        var x = a;
        var y = await this.doX(x);
        var z = await this.doX(y);
        return await this.doX(z);
    }
    @activity()
    async doX(b){
        console.log('sleeping for',b);
        await delay(b * 1000)
        return b * 2;
    }
}
workflowFactory.sample3 = sample3;
export default sample3;

