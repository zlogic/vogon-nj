var winston = require('winston');

var stream = {write: winston.info};

/*
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {'showLevel': false});
*/
winston.level = 'debug';

module.exports.logger = winston;
module.exports.stream = stream;
