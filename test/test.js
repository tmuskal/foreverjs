require('babel-polyfill');
const foreverjs = require('../src/index');
const _ = require("lodash");
Array.range = function(n) {
    // Array.range(5) --> [0,1,2,3,4]
    return Array.apply(null, Array(n)).map((x, i) => i)
};

Object.defineProperty(Array.prototype, 'chunk', {
    value: function(n) {

        // ACTUAL CODE FOR CHUNKING ARRAY:
        return Array.range(Math.ceil(this.length / n)).map((x, i) => this.slice(i * n, i * n + n));

    }
});
class InnerTest extends foreverjs.WorkflowController {
    @foreverjs.workflow({ cache: false })
    async s(urls) {
        var total_links = [];
        let moreResults = await this.parallel_do(await this.chunk(urls, 1), this.act);

        moreResults.forEach(links => total_links = [...total_links, ...links]);
        console.log("*******************", total_links, moreResults, urls);
        return total_links;
    }
    @foreverjs.activity({ cache: true, blob: true })
    async act(urls) {
        const url = urls[0];
        console.log("url", url)
        return [url + "/1", url + "/2"];
    }

    @foreverjs.activity({ cache: true, blob: true })
    async chunk(array, num) {
        console.log("chunk array2", array);
        return array.chunk(num);
    }
}

class MainTest extends foreverjs.WorkflowController {
    @foreverjs.workflow()
    async s(seedPages, linksPerPage) {
        var total_links_all = seedPages;
        let last_total_links_all = seedPages;
        const iters = 2;
        for (var i = 0; i < iters - 1; i++) {
            let wf2 = new InnerTest("more" + i + this.newDispatchID());

            let moreResults = _.flatten(await this.parallel_do(await this.chunk(last_total_links_all, 250), wf2.s));
            console.log("last_total_links_all", last_total_links_all, moreResults);
            const { total_links, last_total_links } = await this.combine(moreResults, total_links_all, last_total_links_all);
            console.log("combine res2", total_links, last_total_links);
            last_total_links_all = last_total_links;
            total_links_all = total_links;
        }
        console.log("total_links", total_links_all, last_total_links_all, last_total_links_all.length, Math.pow(2, iters) - 1);
        return last_total_links_all;
    }

    @foreverjs.activity({ cache: true, blob: true })
    async combine(urllists, total_links, previous) {
        console.log("combine", urllists, total_links, previous);
        urllists.forEach(links => total_links = [...total_links, ...links]);
        total_links = _.without([...new Set(total_links)], ...previous);
        const res = {
            total_links,
            last_total_links: [...new Set([...total_links, ...previous])]
        }
        console.log("combine res", res);
        return res;
    }

    @foreverjs.activity({ cache: true, blob: true })
    async chunk(array, num) {
        console.log("array", array);
        return array.chunk(num);
    }
}
foreverjs.workflowFactory.MainTest = MainTest;
foreverjs.workflowFactory.InnerTest = InnerTest;

const schedulerClient = foreverjs.schedulerClient;
async function test() {
    var dt = new Date();
    for (var i1 = 0; i1 < 16; i1++) {
        const i = i1;

        setTimeout(() => schedulerClient.run({
            className: 'MainTest',
            name: 's',
            args: [
                [
                    "http://example.com/test/" + i + "/",
                ]
            ],
            id: 'F' + i
        }), i * 1000 * 20)
    }
    // console.log("y = ", y);
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
