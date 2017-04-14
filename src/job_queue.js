class JobQueue {
	constructor(){
		this.innerQueue = [];
	}
	putJob(job){
		this.innerQueue.push(job);
	}
	getJob(cb){
		if(this.innerQueue.length){
			var res= this.innerQueue.pop();
			cb(res);
		}
		else{
			setTimeout(this.getJob.bind(this),100,cb);
		}
	}
}

export default JobQueue;