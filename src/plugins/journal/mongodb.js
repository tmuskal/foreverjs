var MongoClient = require('mongodb').MongoClient, test = require('assert');
var Promise = require('bluebird');
import config from "../../config/config";
// Connection url
var url = config.get('MONGO_DB_CONNECTION_STRING') || 'mongodb://localhost:27017/test2';
let db;
// TODO: lookup between id and collection name
const plugin = {
	init: async function(){		
		// Connect using MongoClient
		db = await MongoClient.connect(url);		
	},
	getEntries: async function({id}){

			var col = db.collection(id);
			var results = await col.find({}).toArray();
			return results;
	},
	getJournals: async function({debug}){			
			const collections = await db.collections();
			const results = collections.map(c => c.collectionName);
			return results;
	},	
	clear: async function({id}){
			var col = db.collection(id);
			await col.drop();			
	},		
	append: async function({entry,id}){			
			var col = db.collection(id);
			await col.insertOne(entry);		
	}
}

export default plugin;