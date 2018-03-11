const { initializeUtil } = require('../utils/pluggableUtils').default;
export default require('jayson/promise').server(initializeUtil('journal', process.env.JOURNAL_DB_PLUGIN)).http();
