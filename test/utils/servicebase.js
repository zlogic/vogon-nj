var dbService = require('../../services/dbservice');
var tokencleaner = require('../../services/tokencleaner');
var logger = require('../../services/logger').logger;
var superagent = require('superagent');
var dbConfiguration = require('./dbconfiguration');
var util = require('util');
require('./logging');

var app = require('../../app');
var http = require('http');

var port = 3000;
var baseUrl = "http://localhost:" + port;

var authenticateUser = async function(userData, callback){
  var result = await superagent.post(baseUrl + "/oauth/token")
    .send("username=" + userData.username)
    .send("password=" + userData.password)
    .send("grant_type=password");
  return {token: result.body.access_token, result: result};
};

var sleep = util.promisify(setTimeout);

var tokenHeader = function(token){
  return {Authorization: "Bearer " + token};
};

var hooks = function(){
  var server;
  before(function(done){
    tokencleaner.rescheduleCleaner = function(){};
    app.set('port', port);
    server = http.createServer(app);
    server.listen(port, null, null, done);
  });

  after(function(done) {
    server.close(done);
  });

  beforeEach(function() {
    logger.info(this.currentTest.fullTitle());
    dbConfiguration.reconfigureDb();
    return dbService.sequelize.sync({force: true});
  });

  afterEach(function() {
    return dbService.sequelize.close();
  });
}

module.exports.baseUrl = baseUrl;
module.exports.hooks = hooks;
module.exports.authenticateUser = authenticateUser;
module.exports.sleep = sleep;
module.exports.tokenHeader = tokenHeader;
