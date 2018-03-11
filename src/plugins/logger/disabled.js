var winston = require('winston');
const plugin = new(winston.Logger)({
    transports: []
});
plugin.init = () => {};
export default plugin;
