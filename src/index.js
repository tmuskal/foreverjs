const jayson = require('jayson/promise');
import WorkflowController from './workflow_controller';
import workflow from './annotations/workflow';
import activity from './annotations/activity';
import Worker from './worker';
import workflowFactory from './workflow_factory';
import schedulerClient from './scheduler/client';


export {workflowFactory, Worker, workflow, WorkflowController, activity, schedulerClient};

// todo: telegram bot: https://github.com/yagop/node-telegram-bot-api
// todo: persistence layer for graph entities.
// todo: easier registration of workflows. (self registering)
// todo: config
// todo: 	client configuration for server addresses
// todo: discover recovering processes (timers, active journals) in scheduler start
// todo: journal backend plugins
// todo: persist journal server
// todo: server for human job signaling
// todo: scheduler client. - dynamic object that proxies calls to schduler server
// todo: exports, register, package, deploy - jsforever, better name.
// todo: make deployment with custom workflow easy. - discovery with scheduler, etc.

// todo: job queue backend plugins
// todo: handle timeouts - task - schedule to start. schedule to complete. start to complete. heatbeat.
// todo: handle timeouts - main workflow - decision task start to complete, workflow schedule to complete (fail).
// todo: handle timeouts - signals - timeout to signal
// todo: configuration for all timeouts and retries
// todo: workers - different queues.
// todo: scheduler - integrate with mesos/hadoop
// todo: parallel jobs
// todo: workflow and activity versioning, murmur of function code?
