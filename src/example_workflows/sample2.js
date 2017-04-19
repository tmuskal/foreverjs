import {workflowFactory, workflow, WorkflowController, activity} from '../index';


class sample2 extends WorkflowController{
    @workflow()
    async doA3(a){
        var x = a;
        var b = await this.doB5(x);
        var m = await this.waitForSignal("human 1");
        // var aa = await this.doX();
        return b;
    }
    fireSignal(){
        this.scheduler.signal("human 1","hello");
    }
    @activity()
    async doB5(n){
        setTimeout(this.fireSignal.bind(this),2000)
        return n * n;
    }
    @activity()
    async doX(){
        console.log('doX');
        throw new Error('not working');
    }
}
workflowFactory.sample2 = sample2;
export default sample2;

