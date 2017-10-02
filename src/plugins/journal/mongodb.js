var MongoClient = require('mongodb').MongoClient, test = require('assert');
var Promise = require('bluebird');
import config from "../../config/config";
// Connection url
var url = config.get('MONGO_DB_CONNECTION_STRING') || 'mongodb://localhost:27017/test2';

const plugin = {
	init: async function(){		
		// Connect using MongoClient
		
	},
	getEntries: async function({id}){
			const db = await MongoClient.connect(url);
			var col = db.collection(id);			
			var results = await col.find({}).toArray();
			db.close();
			return results;
	},
	getJournals: async function({debug}){
			const db = await MongoClient.connect(url);
			const collections = await db.collections();
			const results = collections.map(c => c.collectionName);
			db.close();
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