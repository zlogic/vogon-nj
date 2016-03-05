var assert = require('assert');
var dbService = require('../services/model');
var fs = require('fs');
var logger = require('./logger.js');
var prepopulate = require('./prepopulate');
var superagent = require('superagent');
var i18n = require('i18n');
var dbConfiguration = require('./dbconfiguration.js');

var app = require('../app');
var http = require('http');
var morgan = require('morgan');

var port = 3000;
var baseUrl = "http://localhost:" + port;

describe('Service', function() {
  var server;
  before(function(){
    dbConfiguration.reconfigureDb();
  });
  beforeEach(function(done) {
    logger.logFunction(this.currentTest.fullTitle());
    return dbService.sequelize.sync({force: true}).then(function(task){
      dbService.sequelize.options.logging = logger.logFunction;
      done();
    });
  });
  beforeEach(function(done) {
    app.set('port', port);
    server = http.createServer(app);
    app._router.stack.filter(function(layer){
      return layer.name === 'logger';
    }).forEach(function(layer){
      layer.handle = morgan('tiny', {stream: logger.stream});
    });
    server.listen(port, null, done);
  });

  afterEach(
    function(done) {
      logger.flush(done);
    }
  );
  afterEach(
    function(done) {
      server.close(done);
    }
  );

  describe('actions', function () {
    it('should be able to register a new user if registration is allowed', function (done) {
      var userData = {username: "user01", password: "password"};
      process.env.ALLOW_REGISTRATION = true;
      superagent.post(baseUrl + "/register").send(userData).end(function(err, result){
        if(err) return done(err);
        try {
          assert.equal(result.status, 200);
          assert.deepEqual(result.body, {username : 'user01'});
          dbService.User.findAll().then(function(users){
            assert.equal(users.length, 1);
            assert.equal(users[0].username, 'user01');
            users[0].validatePassword('password', function(err, passwordValid){
              if(err) return done(err);
              try {
                assert.equal(passwordValid, true);
                done();
              } catch (err) { done(err) };
            })
          }).catch(done)
        } catch(err) {done(err);}
      });
    });

    it('should not be able to register a new user if registration is not allowed', function (done) {
      var userData = {username: "user01", password: "password"};
      process.env.ALLOW_REGISTRATION = false;
      superagent.post(baseUrl + "/register").send(userData).end(function(err, result){
        try {
          assert.ok(err);
          assert.equal(result.status, 500);
          assert.deepEqual(result.body, {exception : i18n.__('Registration is not allowed')});
          dbService.User.findAll().then(function(users){
            assert.equal(users.length, 0);
            done();
          }).catch(done)
        } catch(err) {done(err);}
      });
    });
    it('should not be able to register a new user if the username is already in use', function (done) {
      var userData = {username: "user01", password: "anotherpassword"};
      process.env.ALLOW_REGISTRATION = true;
      prepopulate().then(function(){
        superagent.post(baseUrl + "/register").send(userData).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(result.status, 500);
            assert.deepEqual(result.body, {exception : i18n.__('User already exists')});
            dbService.User.findAll().then(function(users){
              assert.equal(users.length, 1);
              assert.equal(users[0].username, 'user01');
              users[0].validatePassword('mypassword', function(err, passwordValid){
                if(err) return done(err);
                try {
                  assert.equal(passwordValid, true);
                  done();
                } catch (err) { done(err) };
              })
            }).catch(done)
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
  });
});
