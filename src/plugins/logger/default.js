var winston = require('winston');
const plugin = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            colorize: false,
            level: 'info'
        }),
    ]
});
plugin.init = () => {};
export default plugin;
