class JobQueue {
	constructor(){
		this.innerQueue = [];
	}
	putJob(job){
		this.innerQueue.push(job);
	}
	getJob(cb, times){
		if(!times)
			times = 1;
		if(this.innerQueue.length){
			var res= this.innerQueue.pop();
			cb(res);
		}
		else{
			if(times > 100)
				cb();
			else
				setTimeout(this.getJob.bind(this),100,cb, times+1);
		}
	}
}

export default JobQueue;