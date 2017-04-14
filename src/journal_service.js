class Journal{
	constructor(id){
		this.entries = [];
		this.id = id;
	}
	getEntries(){
		return this.entries;
	}	
	append(entry){
		// console.log("journal:",this.id,entry);
		this.entries.push(entry);
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