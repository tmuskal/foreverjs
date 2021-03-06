const {workflowLoader,server} = require('../src/index');
const schedulerClient = require('../src/scheduler/client').default;
var normalizedPath = require("path").join(__dirname, "../src/example_workflows");
workflowLoader.load(normalizedPath);
server.startAll();

function stopAll(){	
	server.stopAll();
	process.exit();
}

// dispatcher (gateway - this is exposed in a remote client)
async function testSimple3(){
	var dt = new Date();	
	var y = await schedulerClient.run({className:'softwareDevelopment',name:'newFeature',args:[{name:"new f1"}],id:'test1' + dt});
	console.log("y = ",y);
	stopAll();
}
async function testSimple2(){
	var dt = new Date();	
	var y = await schedulerClient.run({className:'sample',name:'doA',args:[5],id:'test1' + dt});
	console.log("y = ",y);
	stopAll();
}
async function testSimple4(){
	var dt = new Date();	
	var y = await schedulerClient.run({className:'sample3p',name:'start',args:[1],id:'test1' + dt});
	console.log("y = ",y);
	stopAll();
}
testSimple4().catch((err)=>console.log('got error', err));
// testSimple3().catch((err)=>console.log('got error', err));
