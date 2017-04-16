const jayson = require('jayson/promise');
var client = jayson.client.http('http://localhost:4001');

class Journal{
	constructor(id){
		this.id = id;
	}
	async getEntries(){
		return (await client.request('getEntries', {id:this.id})).result;
	}	
	append(entry){
		// console.log("journal:",this.id,entry);
		return client.request('append',{entry, id:this.id});
	}
}
class JournalService{
	constructor(){
		this.journals = {};
	}
	getJournal(id){
		var journal = this.journals[id];
		if(!journal){			
			this.journals[id] = journal = new Journal(id);
		}
		return journal;
	}	
}

export default new JournalService();