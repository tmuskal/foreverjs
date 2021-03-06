import jobQueueServer from './job_queue/server';
import journalServer from './journal/server';
import schedulerServer from './scheduler/server';
import workerServer from './workers/server';
import logger from './logger';

function startAll(){
    if(process.env.ENABLE_JOBQUEUE)
        jobQueueServer.listen(4002);
    if(process.env.ENABLE_JOURNAL)
        journalServer.listen(4001);
    if(process.env.ENABLE_SCHEDULER)
        schedulerServer.listen(4003);
    workerServer.runAll().then(()=>logger.info("ready"));

}
function stopAll(){
    workerServer.stop = true;
    if(process.env.ENABLE_JOURNAL)
        journalServer.close();
    if(process.env.ENABLE_SCHEDULER)
        schedulerServer.close();
    if(process.env.ENABLE_JOBQUEUE)
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
