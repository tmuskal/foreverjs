var MongoClient = require('mongodb').MongoClient, test = require('assert');
var Promise = require('bluebird');
// Connection url
var url = 'mongodb://localhost:27017/test';
const plugin = {
	init: async function(){		
		// Connect using MongoClient
		
	},
	getEntries: async function({id}){
			const db = await MongoClient.connect(url);
			var col = db.collection(id);			
			var results = await col.find({}).toArray();
			db.close()
			return results;
	},	
	clear: async function({id}){
			const db = await MongoClient.connect(url);
			var col = db.collection(id);			
			await col.drop();
			db.close()
	},		
	append: async function({entry,id}){
			const db = await MongoClient.connect(url);
			var col = db.collection(id);
			await col.insertOne(entry);
			db.close()
	}
}

export default plugin;