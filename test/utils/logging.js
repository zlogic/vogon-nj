var logger = require('../../services/logger').logger;
var winston = require('winston');
var path = require('path');

logger.configure({
  level: 'silly',
  transports: [
    new winston.transports.File({ filename: path.join('test', 'tmp', 'tests.log')})
  ],
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.printf(info => `${info.message}`)
  )
});
