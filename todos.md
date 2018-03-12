features:
	scheduler client - dynamic object that proxies calls to schduler server
	docker tasks - have socket to docker. run and interact through envs/stdin/stdout/stderr errorlevel
	tasks types:
		kubernetes tasks - dispatch as kubernetes jobs, get notified when done - to mark as completed and taint
		bash tasks
	server for human job signaling
	persistence layer for graph entities. (resource manager)
	workflow and activity versioning, murmur of function code / manual (then through env) ?
	global trusted cache:
		annotate cache as public
		extract blobs
		global cache server:
			register workflow:
				put a .foreverjs.yaml file in your repo
				system will scan repos and run workers with the Dockerfile
			execution flow:
				in local dispatch
				get object from global cache server. 
				if !exist, execute and report results to global cache server unless it is a truster runner
				global cache server should execute the task and dispatch the task/workflow
				2nd phase: crypto based
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
	workers - different queues.
refactoring:
	refactor telegram bot outside of main lib
	refactor uses of journal.append
deployment:
	make deployment with custom workflow easy. - discovery with scheduler, etc.
	docker images for servers - with CI
	fix ci for npm package
	helm package
	seed repo - yeoman
	
	
