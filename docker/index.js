
require('babel-polyfill');
var foreverjs = require('foreverjs');

/*
 register workflows
 ------------------

 class NewWorkflow extends foreverjs.WorkflowController{
 }
 foreverjs.workflowFactory.NewWorkflow = NewWorkflow
*/

foreverjs.server.startAll();
