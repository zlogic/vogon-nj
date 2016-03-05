var dbService = require('../services/model');
var path = require('path');
var testdir = require('./testdir');

var reconfigureDb = function(){
  dbService.sequelize.connectionManager.sequelize.options.storage = path.resolve(testdir.tmpdir, "vogon-nj.sqlite");
}

module.exports.reconfigureDb = reconfigureDb;
