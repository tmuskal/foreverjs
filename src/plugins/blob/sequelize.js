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

function roughSizeOfObject(object, thresh) {
	function literalSize(value) {
		const theType = typeof value;
		if (theType === 'boolean') {
			return 4;
		}
		else if (theType === 'string') {
			return value.length * 2;
		}
		else if (theType === 'number') {
			return 8;
		}
	}
	var objectList = [];
	var stack = [object];
	var bytes = 0;
	while (stack.length) {
		var value = stack.pop();
		if (typeof value === 'object' && objectList.indexOf(value) === -1) {
			objectList.push(value);
			for (var i in value) {
				// key
				bytes = bytes + i.toString().length;
				stack.push(value[i]);
			}
		}
		else {
			bytes += literalSize(value);
		}
		if (bytes >= thresh) {
			return bytes;
		}
	}
	return bytes;
}

const Entry = sequelize.define('blob', {
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

let keyNum = 0;
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
	setData: async function({ entry }) {
		const thresh = process.env.BLOB_MIN_SIZE || 100;
		if (roughSizeOfObject(entry, thresh) >= thresh) {
			const key = 'key' + keyNum++;
			//entries[key] = entry;
			await Entry.upsert({
				key,
				data: JSON.stringify(entry)
			});
			return { _blobKey: key };
		}
		else
			return entry;
	}
}

export default plugin;
