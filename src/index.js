const jayson = require('jayson/promise');
import WorkflowController from './workflow_controller';
import workflow from './annotations/workflow';
import activity from './annotations/activity';
import humanActivity from './annotations/human_activity';
import Worker from './worker';
import workflowFactrory from './workflow_factory';


export {workflowFactrory, Worker, humanActivity,workflow, WorkflowController, activity};

// todo: support promises
// todo: persist journal server
// todo: workers
// handle decision task scheduling and journal
// todo: add current context
// todo: handle signals
// todo: handle fails and retries
// todo: handle children workflow
// todo: handle timers 
// todo: handle timeouts
// todo: handle continue as new
// todo: handle humanActivities (task + wait for signal + task)
// todo: workflow and activity versioning
// todo: gateway server - get params, class and function name. should return workflowid. another handler for getresults/status of a running job.
// todo: gateway client. - dynamic object that proxies calls to gateway server
// todo: make deployment with custom workflow easy. - discovery with scheduler, etc.
// todo: parallel jobs
// todo: exports, register, package, deploy - jsforever, better name.
// todo: integrate with mesos/hadoop