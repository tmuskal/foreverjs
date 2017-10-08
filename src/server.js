import jobQueueServer from './job_queue/server';
import journalServer from './journal/server';
import schedulerServer from './scheduler/server';
import workerServer from './workers/server';

function startAll(number_of_workers){    
    jobQueueServer.listen(4002);
    journalServer.listen(4001);
    schedulerServer.listen(4003);
    workerServer.runAll(number_of_workers).then(()=>console.log("worker running"));

}
function stopAll(){
    workerServer.stop = true;
    journalServer.close();
    schedulerServer.close();
    jobQueueServer.close();
}

export default {
    jobQueueServer,
    journalServer,
    schedulerServer,
    workerServer,
    startAll,
    stopAll
}
