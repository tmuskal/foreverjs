add queues for taint/scheduler?
add redis - journal and queues
add locking - https://github.com/mike-marcacci/node-redlock
fix lambda fails
fix endless taints.
handle decision task timeout
add hearbeat action for tasks
docker tasks - have socket to docker
handle timeouts in taint
reset timer in recovery
make journal addition a transactional process - in task completion and in decision complete
handle timeouts - task - schedule to start. schedule to complete. start to complete. heatbeat.
handle timeouts - main workflow - decision task start to complete, workflow schedule to complete (fail).
handle timeouts - signals - timeout to signal
tests:
	test for recovery
	test for timeouts
	normal flows	
archive completed failed/journals
serialize inputs and outputs
big blob plugin (s3,hbase, etc)
dynamically load workflows from files ( "./workflows" in running dir) - what about packages in docker? - cp package.json and install onbuild
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
workflow and activity versioning, murmur of function code? 
refactor uses of journal.append
auto roles dist when running servers in parallel
