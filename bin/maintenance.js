#!/usr/bin/env node

var dbService = require('../services/model');

dbService.sequelize.sync().then(function () {
  return dbService.performMaintenance();
});
