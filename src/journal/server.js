const jayson = require('jayson/promise');
const entries = {};

var server = jayson.server({
	getEntries: async function({id}){
			if(!entries[id])
				return [];
			else{
				// console.log("journal list", entries[id]);
				return entries[id];
			}
	},	
	clear: async function({id}){	      
			entries[id] = [];
	},		
	append: async function({entry,id}){
			// console.log("journal:",id,entry);
			if(!entries[id])
				entries[id] = [];
			entries[id].push(entry);
	}
});

const http = server.http()
export default http;