var winston = require('winston');
const plugin = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            colorize: false,
            level: 'debug'
        }),
    ]
});
plugin.init = () => {};
export default plugin;
