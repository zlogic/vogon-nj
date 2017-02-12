var model = require('../../services/model');
var dbService = require('../../services/dbservice');
var path = require('path');
var testdir = require('./testdir');
var Sequelize = require('sequelize');
var logger = require('../../services/logger').logger;

var reconfigureDb = function(inMemory){
  inMemory = inMemory !== undefined ? inMemory : true;
  var storage = inMemory === true ? ":memory:" : path.resolve(testdir.tmpdir, "vogon-nj.sqlite");
  var currentDbService = model.model("sqlite:", {storage: storage, isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.verbose});
  for(var k in currentDbService)
    dbService[k] = currentDbService[k];
}

module.exports.reconfigureDb = reconfigureDb;
