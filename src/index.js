const jayson = require('jayson/promise');
import WorkflowController from './workflow_controller';
import workflow from './annotations/workflow';
import activity from './annotations/activity';
import humanActivity from './annotations/human_activity';
import Worker from './worker';
import workflowFactrory from './workflow_factory';


export {workflowFactrory, Worker, humanActivity,workflow, WorkflowController, activity};

// todo: persist journal server
// handle decision task scheduling and journal
// todo: handle signals
// todo: handle timers
// todo: handle humanActivities (task + wait for signal + task)
// todo: handle timeouts
// todo: handle fails and retries, flows and activities. main workflow fail
// todo: handle continue as new
// todo: workflow and activity versioning, murmur of function code?
// todo: scheduler - get params, class and function name. should return workflowid. another handler for getresults/status of a running job.
// todo: scheduler client. - dynamic object that proxies calls to schduler server
// todo: workers - different queues.
// todo: parallel jobs
// todo: exports, register, package, deploy - jsforever, better name.
// todo: make deployment with custom workflow easy. - discovery with scheduler, etc.
// todo: add current context
// todo: journal backend plugins
// todo: job queue plugins
// todo: scheduler - integrate with mesos/hadoop
