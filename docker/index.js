
require('babel-polyfill');
var foreverjs = require('foreverjs');

/*
 register workflows
 ------------------

 class NewWorkflow extends foreverjs.WorkflowController{
 }
 foreverjs.workflowFactory = NewWorkflow
*/

foreverjs.server.startAll();
