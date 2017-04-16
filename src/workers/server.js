import Worker from '../worker';

const worker = new Worker();
worker.runAll().then(()=>console.log("worker running"));


export default worker;