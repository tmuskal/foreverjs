handle timeouts in taint
handle timeouts - task - schedule to start. schedule to complete. start to complete. heatbeat.
handle timeouts - main workflow - decision task start to complete, workflow schedule to complete (fail).
handle timeouts - signals - timeout to signal
test for recovery
test for timeouts
archive completed failed/journals
dynamically load workflows from files ( "./workflows" in running dir) - what about packages in docker?
job queue backend plugins
config
	client configuration for server addresses (from env)
exports, register, package, deploy - jsforever, better name.
make deployment with custom workflow easy. - discovery with scheduler, etc.


scheduler client. - dynamic object that proxies calls to schduler server


server for human job signaling
refactor telegram bot outside of main lib
persistence layer for graph entities. (resource manager)
configuration for all timeouts and retries
workers - different queues.
scheduler - integrate with mesos/hadoop
parallel jobs
workflow and activity versioning, murmur of function code? 
auto roles dist when running servers in parallel
refactor uses of journal.append