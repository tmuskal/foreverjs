const { initializeUtil } = require('../utils/pluggableUtils').default;
export default require('jayson/promise').server(initializeUtil('job_queue')).http();
