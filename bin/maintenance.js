#!/usr/bin/env node

var dbService = require('../services/dbservice');

dbService.sequelize.sync().then(function () {
  return dbService.performMaintenance();
});
