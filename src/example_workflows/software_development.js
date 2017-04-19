import {workflowFactory, workflow, WorkflowController, activity} from '../index';

var t =0;
class softwareDevelopment extends WorkflowController{
    @workflow()
    async newFeature({name}){
        var definitions = {};
        var i = 0;
        while(!definitions.results){
            var aname = name;
            i++;
            if(definitions.error){
                aname = definitions.error + ", " + name
            }
            definitions = await this.doHuman({
                prepare:this.prepare,
                process:this.process,
                id:'define_' + i,
                payload:aname
            });
        }
        // var aa = await this.doX();
        return definitions.results;
    }
    fireSignal(id){
        t++;
        if(t > 5)
            this.scheduler.signal(id,"hello");
        else
            this.scheduler.signal(id,"hello2");
    }
    @activity()
    async process(n,id){
        if(n=="hello"){
            return {
                results: n
            }
        }
        else return {
            error: "bad response"
        }
        return n;
    }

    @activity()
    async prepare(description,id){
        setTimeout(this.fireSignal.bind(this),2000,id)
        console.log('preparing',description);
    }

    @activity()
    async do(n){
    }

}

// in worker and schduler
workflowFactory.softwareDevelopment = softwareDevelopment;

export default softwareDevelopment;
