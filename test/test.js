require('babel-polyfill');
const foreverjs = require('../src/index');
const _ = require("lodash");
Array.range = function(n) {
  // Array.range(5) --> [0,1,2,3,4]
  return Array.apply(null,Array(n)).map((x,i) => i)
};

Object.defineProperty(Array.prototype, 'chunk', {
  value: function(n) {

    // ACTUAL CODE FOR CHUNKING ARRAY:
    return Array.range(Math.ceil(this.length/n)).map((x,i) => this.slice(i*n,i*n+n));

  }
});
class InnerTest extends foreverjs.WorkflowController {
    @foreverjs.workflow()
    async s(urls) {
        var total_links = [];
        let moreResults = await this.parallel_do(urls, this.act);
        moreResults.forEach(links => total_links = [...total_links, ...links]);
        return total_links;
    }
    @foreverjs.activity()
    async act(url) {
        return [url + "/1", url + "/2"];
    }
}

class MainTest extends foreverjs.WorkflowController {
    @foreverjs.workflow()
    async s(seedPages, linksPerPage) {
        var total_links = seedPages;
        let last_total_links = seedPages;
        const iters = 10;
        for (var i = 0; i < iters - 1; i++) {
            let wf2 = new InnerTest("more" + i + this.newDispatchID());
            let moreResults = await this.parallel_do(total_links.chunk(250), wf2.s);
            moreResults.forEach(links => total_links = [...total_links, ...links]);
            total_links = _.without([...new Set(total_links)], ...last_total_links);
            last_total_links = [...new Set([...total_links, ...last_total_links])];
        }
        console.log("total_links", last_total_links.length, Math.pow(2, iters) - 1);
        return last_total_links;
    }
}
foreverjs.workflowFactory.MainTest = MainTest;
foreverjs.workflowFactory.InnerTest = InnerTest;

const schedulerClient = foreverjs.schedulerClient;
async function test() {
    var dt = new Date();
    for (var i = 0; i < 16; i++) {
        var y = schedulerClient.run({
            className: 'MainTest',
            name: 's',
            args: [
                [
                    "http://example.com/test/" + i + "/" + dt.getTime().toString(),
                ]
            ],
            id: 'F' + i
        });
    }
    console.log("y = ", y);
}
var docker = process.env.LOCAL_MODE !== 'true';
if (docker)
    foreverjs.server.startAll();
else {
    test().catch((err) => {
        console.log('got error', err)
    }).then(a => {

    });
}

if (process.env.DISPATCH_JOB === 'true') {
    test().catch((err) => {
        console.log('got error', err)
    }).then(a => {});
}
