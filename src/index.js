import WorkflowController from './workflow_controller';
import workflow from './annotations/workflow';
import activity from './annotations/activity';
import Worker from './worker';
import workflowFactory from './workflow_factory';
import schedulerClient from './scheduler/client';
import server from './server';
var fs = require("fs");

class WorkflowLoader{
    load(path){
        fs.readdirSync(path).forEach(function(file) {
            require( path+ "/" + file);
        });
    }
}
const workflowLoader= new WorkflowLoader();

export {workflowFactory, Worker, workflow, WorkflowController, activity, schedulerClient,workflowLoader,server};


// todo: dynamically load workflows
// todo: config
// todo: 	client configuration for server addresses (from env)
// todo: journal backend plugins
// todo: persist journal server
// todo: exports, register, package, deploy - jsforever, better name.
// todo: make deployment with custom workflow easy. - discovery with scheduler, etc.

// todo: discover recovering processes (timers, active journals) in scheduler start
// todo: handle timeouts - task - schedule to start. schedule to complete. start to complete. heatbeat.
// todo: job queue backend plugins
// todo: scheduler client. - dynamic object that proxies calls to schduler server
// todo: handle timeouts - main workflow - decision task start to complete, workflow schedule to complete (fail).
// todo: handle timeouts - signals - timeout to signal


// todo: server for human job signaling
// todo: refactor telegram bot outside of main lib
// todo: persistence layer for graph entities. (resource manager)
// todo: configuration for all timeouts and retries
// todo: workers - different queues.
// todo: scheduler - integrate with mesos/hadoop
// todo: parallel jobs
// todo: workflow and activity versioning, murmur of function code?
