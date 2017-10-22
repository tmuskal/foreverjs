var winston = require('winston');

export default new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: false,      
      level: 'debug'
    }),   
  ]
});