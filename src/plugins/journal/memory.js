const entries = {};
const plugin = {
	init: async function(){
		return;
	},
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
	getJournals: async function(){
			return Object.keys(entries);
	},	
	append: async function({entry,id}){
			// console.log("journal:",id,entry);
			if(!entries[id])
				entries[id] = [];
			entries[id].push(entry);
	}
}

export default plugin;