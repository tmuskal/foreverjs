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
		if(this.entries == null){
			var res = (await client.request('getEntries', {id:this.id}));
			if(res.error)
				throw new Error(res.error);
			this.entries = res.result;
		}
		return this.entries;
	}
	async clear(){
		this.entries = [];
		var res = (await client.request('clear', {id:this.id}));
		if(res.error)
			throw new Error(res.error);		
		return res.result;
	}
	async append(entry){
		this.entries = await this.getEntries();
		if(!this.entries)
			this.entries = [];
		this.entries.push({entry, id:this.id});
		// console.log("journal:",this.id,entry);
		var res = client.request('append',{entry, id:this.id});
		if(res.error)
			throw new Error(res.error);		
		return true;
	}
}
class JournalService{
	constructor(){
		this.journals = {};
	}
	getJournal(id){
		var journal = this.journals[id];
		if(!journal){
			journal = new Journal(id);
			// this.journals[id] = journal
		}
		return journal;
	}	
	async getJournals(){
		return await client.request('getJournals',{debug:true});
	}	
}

export default new JournalService();