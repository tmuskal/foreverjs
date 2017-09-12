require("babel-core/register");
require("babel-polyfill");

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

