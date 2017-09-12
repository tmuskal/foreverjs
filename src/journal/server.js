const jayson = require('jayson/promise');
const inMemoryPlugin = require('../plugins/journal/memory').default;
const mongoPlugin = require('../plugins/journal/mongodb').default;
const entries = {};
const plugin = mongoPlugin;

plugin.init();

var server = jayson.server(plugin);

const http = server.http()
export default http;