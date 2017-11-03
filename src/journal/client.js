const jayson = require('jayson/promise');
import config from "../config/config";
// Connection url

var client = jayson.client.http(config.get('JOURNAL_SERVICE_ENDPOINT') || 'http://localhost:4001');

class Journal{
	constructor(id){
		this.id = id;
		this.entries = null;
	}
	async getEntries(){
		if(!this.entries){
			this.entries = (await client.request('getEntries', {id:this.id})).result;			
		}
		return this.entries;
	}
	async clear(){
		this.entries = [];
		return (await client.request('clear', {id:this.id})).result;
	}
	async append(entry){
		if(!this.entries){
			this.entries = (await client.request('getEntries', {id:this.id})).result;
		}
		this.entries.push({entry, id:this.id});
		// console.log("journal:",this.id,entry);
		return await client.request('append',{entry, id:this.id});
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
	async getJournals(){
		return await client.request('getJournals',{debug:true});
	}	
}

export default new JournalService();