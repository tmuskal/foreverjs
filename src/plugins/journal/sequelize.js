const Sequelize = require('sequelize');
var Promise = require('bluebird');
import config from "../../config/config";
import logger from '../../logger';

// Connection url
var url = config.get('SEQUELIZE_CONNECTION_STRING') || 'mongodb://localhost:27017/test2';
let db;
const sequelize = new Sequelize(url ,{

  // disable logging; default: console.log
  logging: false

});

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
	createdAt: 'createdAt',	
});


// TODO: lookup between id and collection name
const plugin = {
	init: async function(){					
		try{
			sequelize
			  .authenticate()
			  .then(() => {
			    logger.info('Connection has been established successfully.');
			    return Entry.sync({});
			  }).then(() => {
			  	logger.info('Table created/updated');
				  // Table created
			  }).catch(err => {
				logger.error('Unable to connect to the database:', err);
				process.exit(-1);
			  });
		}
		catch(e){
			process.exit(-1);
		}		
	},
	getEntries: async function({id}){		
		return Entry.findAll({ where: { journal: id },order:[['id']] }).then(entries=> {
			// logger.debug('data in entries',id,entries,entries.length);
		  	return entries.map(e=>JSON.parse(e.data))
		}).then((entries)=>{
			// logger.debug('data in entries after map',id,entries,entries.length);
			return entries;
		});
	},
	getJournals: async function({debug}){
		return await Entry.findAll({ attributes: ['journal'], group: ["journal"]}).then(entries=>
			entries.map(e=>e.journal)
		);
	},	
	clear: async function({id}){
		return await Entry.destroy({
		  where: {
		    journal: id
		  }
		});
	},		
	append: async function({entry,id}){
		  return await Entry.create({
		   	journal:id,
		   	data:JSON.stringify(entry)
		  });
	}
}

export default plugin;