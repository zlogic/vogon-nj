var model = require('../../services/model');
var dbService = require('../../services/dbservice');
var path = require('path');
var testdir = require('./testdir');
var Sequelize = require('sequelize');
var logger = require('../../services/logger');

var reconfigureDb = function() {
  var currentDbService = model.model("sqlite:", {storage: ":memory:", isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.sequelizeLogger, operatorsAliases: false});
  var promise = dbService.sequelize.close();
  for(var k in currentDbService)
    dbService[k] = currentDbService[k];
  return promise || Sequelize.Promise.resolve();
}

module.exports.reconfigureDb = reconfigureDb;
