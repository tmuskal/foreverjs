features:
	scheduler client. - dynamic object that proxies calls to schduler server
	docker tasks - have socket to docker/kubernetes
	bash tasks
	workflow and activity versioning, murmur of function code? 
	server for human job signaling
	persistence layer for graph entities. (resource manager)
	workers - different queues.
	scheduler - integrate with mesos/hadoop/k8s
reliability:
	ability to handle lambda fails
	add locking - https://github.com/mike-marcacci/node-redlock
	reset timer in recovery
	make journal addition a transactional process - in task completion and in decision complete
	retries should have a different dispatchid
	handle more timeouts in taint
	handle decision task timeout
	handle timeouts - task - schedule to start. schedule to complete. start to complete. heatbeat.
	handle timeouts - main workflow - decision task start to complete, workflow schedule to complete (fail).
	handle timeouts - signals - timeout to signal
	add hearbeat action for tasks
	add queues for taint/scheduler?
tests:
	test for recovery
	test for timeouts
	normal flows	
plugins:
	job queue backend plugins
optimizations:
	add redis - journal, queues, cache - https://github.com/rfink/sequelize-redis-cache
	make scheduler concurrently dispatch childs to other schdulers and wait.
refactoring:
	refactor telegram bot outside of main lib
	refactor uses of journal.append
deployment:
	make deployment with custom workflow easy. - discovery with scheduler, etc.
	docker images for servers
	helm package
	seed repo - yeoman
	
	
