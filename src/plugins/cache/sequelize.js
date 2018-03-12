const Sequelize = require('sequelize');
var Promise = require('bluebird');
import config from "../../config/config";
import logger from '../../logger';

// Connection url
var url = config.get('SEQUELIZE_CONNECTION_STRING') || 'mongodb://localhost:27017/test2';
let db;
const sequelize = new Sequelize(url, {

	// disable logging; default: console.log
	logging: false

});

const Entry = sequelize.define('cache', {
	createdAt: Sequelize.DATE,
	key: {
		type: Sequelize.STRING,
		primaryKey: true,
	},
	data: {
		type: Sequelize.TEXT
	},
}, {
	indexes: [{
		fields: ['key']
	}],
	createdAt: 'createdAt',
});


// TODO: lookup between id and collection name
const plugin = {
	init: async function() {
		try {
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
		catch (e) {
			process.exit(-1);
		}
	},
	getData: async function({ key }) {
		return Entry.findAll({
			where: { key }
		}).then(entries => {
			// logger.debug('data in entries',id,entries,entries.length);
			const result = entries.map(e => JSON.parse(e.data));
			return result.length ? result[0] : null;
		});
	},
	clear: async function() {},
	setData: async function({ entry, key }) {
		await Entry.upsert({
			key,
			data: JSON.stringify(entry)
		});
	}

}

export default plugin;
