const Sequelize = require('sequelize');
var Promise = require('bluebird');
import config from "../../config/config";
// Connection url
var url = config.get('SEQUELIZE_CONNECTION_STRING') || 'mongodb://localhost:27017/test2';
let db;

const Entry = sequelize.define('entry', {
	createdAt: Sequelize.DATE,
	journal: Sequelize.STRING,
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
  	data: {
    	type: Sequelize.TEXT
  	},	
},{
	indexes: [
	// Create a unique index on poem
	{		
		fields: ['journal']
	}],
	createdAt: true,	
});

const sequelize = new Sequelize(url);
// TODO: lookup between id and collection name
const plugin = {
	init: async function(){					
		try{
			sequelize
			  .authenticate()
			  .then(() => {
			    console.log('Connection has been established successfully.');
			    return Entry.sync({})
			  }).then(() => {
			  	console.log('Table created/updated');
				  // Table created
			  }).catch(err => {
				console.error('Unable to connect to the database:', err);
				process.exit(-1);
			  });
		}
		catch(e){
			process.exit(-1);
		}		
	},
	getEntries: async function({id}){
		Entry.findAll({ where: { journal: id },order:[['createdAt', 'ASC']], }).then(entries=> {		  
		  return entries.map(e=>JSON.parse(e.data))
		});	
	},
	getJournals: async function({debug}){
		return Entry.findAll({ attributes: ['journal'], group: ["journal"]}).then(entries=>
			entries.map(e=>e.journal)
		);
	},	
	clear: async function({id}){
	},		
	append: async function({entry,id}){
		  return await Entry.create({
		   	journal:id,
		   	data:JSON.stringify(entry)
		  });
	}
}

export default plugin;