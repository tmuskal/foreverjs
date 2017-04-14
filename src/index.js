const jayson = require('jayson/promise');
import WorkflowController from './workflow_controller';
import workflow from './annotations/workflow';
import activity from './annotations/activity';
import humanActivity from './annotations/human_activity';
import Worker from './worker';
import workflowFactrory from './workflow_factory';


export {workflowFactrory, Worker, humanActivity,workflow, WorkflowController, activity};

// todo: add external scheduler - with api
// todo: external journal server
// todo: gateway server
// todo: parallel jobs
// todo: workers
// handle decision task scheduling and journal
// todo: add current context
// todo: handle fails
// todo: handle children workflow
// todo: handle timers 
// todo: handle timeouts
// todo: handle signals
// todo: handle continue as new
// todo: handle humanActivities (task + wait for signal + task)
// todo: versioning
// todo: support promises
// todo: exports, register, package, deploy - jsforever, better name.
// todo: integrate with mesos/hadoop