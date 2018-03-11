const { initializeUtil } = require('../utils/pluggableUtils');
export default require('jayson/promise').server(initializeUtil('job_queue')).http();
