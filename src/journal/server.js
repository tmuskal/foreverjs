const jayson = require('jayson/promise');
const entries = {};

var server = jayson.server({
	getEntries: async function({id}){
	      // server.error just returns {code: 501, message: 'not implemented'}
			if(!entries[id])
				return [];
			else{
				// console.log("journal list", entries[id]);

				return entries[id];
			}
	},	
	append: async function({entry,id}){
			console.log("journal:",id,entry);
			if(!entries[id])
				entries[id] = [];
			entries[id].push(entry);
	}
});
server.http().listen(4001);