const jayson = require('jayson/promise');
const entries = {};
let plugin={};

if(process.env.ENBALE_JOURNAL){
	switch(process.env.JOURNAL_DB_PLUGIN){
	case "mongo":
		plugin =  require('../plugins/journal/mongodb').default;
		break;	
	case "memory":
		plugin =  require('../plugins/journal/memory').default;
		break;
	case "sequelize":
		plugin =  require('../plugins/journal/sequelize').default;
		break;
	}
	plugin.init();
}

var server = jayson.server(plugin);

const http = server.http()
export default http;