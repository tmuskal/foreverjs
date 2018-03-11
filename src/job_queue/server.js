const { initializeUtil } = require('../utils/pluggableUtils').default;
export default require('jayson/promise').server(initializeUtil('jobqueue')).http();
