var model = require('../../services/model');
var dbService = require('../../services/dbservice');
var path = require('path');
var testdir = require('./testdir');
var Sequelize = require('sequelize');
var logger = require('../../services/logger');

var reconfigureDb = function(inMemory){
  inMemory = inMemory !== undefined ? inMemory : (process.env.DOCKER_BUILD || true);
  var storage = inMemory === true ? ":memory:" : path.resolve(testdir.tmpdir, "vogon-nj.sqlite");
  var currentDbService = model.model("sqlite:", {storage: storage, isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.sequelizeLogger});
  var promise = dbService.sequelize.close();
  for(var k in currentDbService)
    dbService[k] = currentDbService[k];
  return promise || Sequelize.Promise.resolve();
}

module.exports.reconfigureDb = reconfigureDb;
