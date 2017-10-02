
require('babel-polyfill');
var foreverjs = require('foreverjs');

/*
 register workflows
 ------------------

 class NewWorkflow extends foreverjs.WorkflowController{
 }
 foreverjs.workflowFactory.NewWorkflow = NewWorkflow
*/
function delay(time) {
  return new Promise(function (fulfill) {   
    setTimeout(fulfill, time);
  });
}

class sample3 extends foreverjs.WorkflowController{
    @foreverjs.workflow()
    async start(seconds){        
        var secondsx2 = await this.sleepAndMultiply(seconds);
        var secondsx4 = await this.sleepAndMultiply(secondsx2);
        return await this.sleepAndMultiply(secondsx4);
    }
    @foreverjs.activity()
    async sleepAndMultiply(seconds){
        console.log('sleeping for',seconds, 'seconds');
        await delay(seconds * 1000)
        return seconds * 2;
    }
}
foreverjs.workflowFactory.sample3 = sample3;

foreverjs.server.startAll();
