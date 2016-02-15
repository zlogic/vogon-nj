var Sequelize = require('sequelize');
var path = require('path');
var os = require('os');

var sequelizeConfigurer = function(){
  if(process.env.DATABASE_URL !== undefined)
    return new Sequelize(process.env.DATABASE_URL);
  else
    return new Sequelize("sqlite:", {storage: path.resolve(os.tmpdir(), "vogon-nj.sqlite")});
};

var sequelize = sequelizeConfigurer();

var Account = sequelize.define('account', {
  name: Sequelize.STRING,
  balance: Sequelize.BIGINT,
  currency: Sequelize.STRING,
  name: Sequelize.STRING,
  includeInTotal: Sequelize.BOOLEAN,
  showInList: Sequelize.BOOLEAN
});

sequelize.sync();

exports.sequelize = sequelize;
