var winston = require('winston');
var i18n = require('i18n');
var split = require('split');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ json: false, showLevel: false })
  ]
});
logger.level = 'silly';

var stream = split().on('data', logger.info);

var logException = function(err){
  logger.error(i18n.__("An error has occurred: %s, status %s, stack trace:\n%s"), err, err.status, err.stack);
};

module.exports.logger = logger;
module.exports.stream = stream;
module.exports.logException = logException;
