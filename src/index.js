const jayson = require('jayson/promise');
import WorkflowController from './workflow_controller';
import workflow from './annotations/workflow';
import activity from './annotations/activity';
import Worker from './worker';
import workflowFactrory from './workflow_factory';


export {workflowFactrory, Worker, workflow, WorkflowController, activity};

// todo: handle fails and retries, activities - test
// todo: main workflow fail or completed.
// todo: handle fails and retries, child flows.
// todo: handle timeouts - task - schedule to start. schedule to complete. start to complete. heatbeat.
// todo: handle timeouts - main workflow - decision task start to complete, workflow schedule to complete (fail).
// todo: handle timeouts - signals - timeout to signal
// todo: configuration for all timeouts and retries
// todo: handle continue as new
// todo: workflow and activity versioning, murmur of function code?
// todo: scheduler client. - dynamic object that proxies calls to schduler server
// todo: client configuration for server addresses
// todo: discover recovering processes (timers) in scheduler start
// todo: workers - different queues.
// todo: exports, register, package, deploy - jsforever, better name.
// todo: make deployment with custom workflow easy. - discovery with scheduler, etc.
// todo: journal backend plugins
// todo: persist journal server
// todo: job queue backend plugins
// todo: scheduler - integrate with mesos/hadoop
// todo: parallel jobs
