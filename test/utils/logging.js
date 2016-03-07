var logger = require('../../services/logger').logger;
var path = require('path');

logger.level = 'debug';
logger.remove(logger.transports.Console);
logger.add(logger.transports.File, { filename: path.join('test', 'tmp', 'tests.log'), json: false, showLevel: false, timestamp: false });
