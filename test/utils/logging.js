var logger = require('../../services/logger').logger;
var winston = require('winston');
var path = require('path');

logger.configure({
  level: 'debug',
  transports: [
    new (winston.transports.File)({ filename: path.join('test', 'tmp', 'tests.log'), json: false, showLevel: false, timestamp: false })
  ]
});
