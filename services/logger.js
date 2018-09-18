var winston = require('winston');
var split = require('split');

var format;
if(process.stdout.isTTY)
  format = winston.format.combine(
    winston.format.colorize(),
    winston.format.splat(),
    winston.format.simple()
  );
else
  format = winston.format.combine(
    winston.format.splat(),
    winston.format.simple()
  );

var logger = winston.createLogger({
  transports: [
    new (winston.transports.Console)({stderrLevels: ['error']})
  ],
  format: format
});
logger.level = 'silly';

var stream = split().on('data', logger.info);

var logException = function(err){
  logger.error("An error has occurred: %s, status %s, stack trace:\n%s", err, err.status, err.stack);
};

var sequelizeLogger = function(args) {
  logger.verbose(args);
}

module.exports.logger = logger;
module.exports.stream = stream;
module.exports.logException = logException;
module.exports.sequelizeLogger = sequelizeLogger;
