workflow and activity versioning, murmur of function code? 
add hearbeat action for tasks
make scheduler concurrently dispatch childs to other schdulers and wait.
add queues for taint/scheduler?
add redis - journal and queues
retries should have a different dispatchid
add locking - https://github.com/mike-marcacci/node-redlock
handle decision task timeout
docker tasks - have socket to docker
reset timer in recovery
make journal addition a transactional process - in task completion and in decision complete
handle more timeouts in taint
handle timeouts - task - schedule to start. schedule to complete. start to complete. heatbeat.
handle timeouts - main workflow - decision task start to complete, workflow schedule to complete (fail).
handle timeouts - signals - timeout to signal
tests:
	test for recovery
	test for timeouts
	normal flows	
job queue backend plugins
make deployment with custom workflow easy. - discovery with scheduler, etc.
dynamically load workflows from files ( "./workflows" in running dir) - what about packages in docker? - cp package.json and install onbuild
scheduler client. - dynamic object that proxies calls to schduler server
server for human job signaling
refactor telegram bot outside of main lib
persistence layer for graph entities. (resource manager)
workers - different queues.
scheduler - integrate with mesos/hadoop/k8s
refactor uses of journal.append