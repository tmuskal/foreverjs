discover recovering processes (timers, active journals) in scheduler start

job queue backend plugins
dynamically load workflows from files ( "./workflows" in running dir) - what about packages in docker?
config
	client configuration for server addresses (from env)
exports, register, package, deploy - jsforever, better name.
make deployment with custom workflow easy. - discovery with scheduler, etc.


handle timeouts - task - schedule to start. schedule to complete. start to complete. heatbeat.
scheduler client. - dynamic object that proxies calls to schduler server
handle timeouts - main workflow - decision task start to complete, workflow schedule to complete (fail).
handle timeouts - signals - timeout to signal


server for human job signaling
refactor telegram bot outside of main lib
persistence layer for graph entities. (resource manager)
configuration for all timeouts and retries
workers - different queues.
scheduler - integrate with mesos/hadoop
parallel jobs
workflow and activity versioning, murmur of function code? 
auto roles dist when running servers in parallel
