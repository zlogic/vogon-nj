var dbService = require('../../services/model');
var logger = require('./logger');
var superagent = require('superagent');
var dbConfiguration = require('./dbconfiguration');
require('./i18nconfiguration');

var app = require('../../app');
var http = require('http');
var morgan = require('morgan');

var port = 3000;
var baseUrl = "http://localhost:" + port;

var authenticateUser = function(userData, callback){
  superagent.post(baseUrl + "/oauth/token")
    .send("username=" + userData.username)
    .send("password=" + userData.password)
    .send("grant_type=password")
    .send("client_id=vogonweb")
    .end(function(err, result){
      if(err) return callback(err);
      callback(null, result.body.access_token, result);
    });
};

var tokenHeader = function(token){
  return {Authorization: "Bearer " + token};
};

var hooks = function(){
  var server;
  before(function(done){
    dbConfiguration.reconfigureDb();
    app.set('port', port);
    server = http.createServer(app);
    app._router.stack.filter(function(layer){
      return layer.name === 'logger';
    }).forEach(function(layer){
      layer.handle = morgan('tiny', {stream: logger.stream});
    });
    server.listen(port, null, null, done);
  });

  after(function(done) {
    server.close(done);
  });

  beforeEach(function(done) {
    logger.logFunction(this.currentTest.fullTitle());
    return dbService.sequelize.sync({force: true}).then(function(task){
      dbService.sequelize.options.logging = logger.logFunction;
      done();
    });
  });

  afterEach(function(done) {
    logger.flush(done);
  });
}

module.exports.baseUrl = baseUrl;
module.exports.hooks = hooks;
module.exports.authenticateUser = authenticateUser;
module.exports.tokenHeader = tokenHeader;
