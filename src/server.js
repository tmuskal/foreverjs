import jobQueueServer from './job_queue/server';
import journalServer from './journal/server';
import schedulerServer from './scheduler/server';
import workerServer from './workers/server';

function startAll(){
    if(process.env.ENBALE_JOBQUEUE)
        jobQueueServer.listen(4002);
    if(process.env.ENBALE_JOURNAL)
        journalServer.listen(4001);
    if(process.env.ENBALE_SCHEDULER)
        schedulerServer.listen(4003);
    workerServer.runAll().then(()=>console.log("worker running"));

}
function stopAll(){
    workerServer.stop = true;
    if(process.env.ENBALE_JOURNAL)
        journalServer.close();
    if(process.env.ENBALE_SCHEDULER)
        schedulerServer.close();
    if(process.env.ENBALE_JOBQUEUE)
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
