var winston = require('winston');

var stream = {write: winston.info};

module.exports.logger = winston;
module.exports.stream = stream;
