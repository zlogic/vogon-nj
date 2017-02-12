var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/dbservice');
var prepopulate = require('./utils/prepopulate').prepopulate;
var superagent = require('superagent');
var i18n = require('i18n');
var uuid = require('node-uuid');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

describe('Service', function() {
  serviceBase.hooks();

  var oneSecond = 1 / (24 * 60 * 60);

  describe('authentication', function () {
    it('should accept authentication of a valid user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
          } catch(err) {done(err);}
          dbService.Token.findAll().then(function(tokens){
            assert.equal(tokens.length, 1);
            assert.equal(tokens[0].id, token);
            assert.equal(tokens[0].UserId, 1);
            done();
          }).catch(done);
        });
      }).catch(done);
    });
    it('should delete authentication of a valid user on logout', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
          } catch(err) {done(err);}
          dbService.Token.findAll().then(function(tokens){
            assert.equal(tokens.length, 1);
            assert.equal(tokens[0].id, token);
            assert.equal(tokens[0].UserId, 1);
            superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token="+token).end(function(err, result){
              if(err) return done(err);
              try {
                assert.ok(result);
                assert.equal(result.status, 200);
                assert.equal(result.text, "");
                dbService.Token.findAll().then(function(tokens){
                  assert.deepEqual(tokens, []);
                  done();
                }).catch(done);
              } catch(err) {done(err);}
            });
          }).catch(done);
        });
      }).catch(done);
    });
    it('should reject authentication for expired tokens', function (testDone) {
      this.timeout(4000);
      var done = function (err) {
        delete process.env.TOKEN_EXPIRES_DAYS;
        return testDone(err);
      }
      var userData = {username: "user01", password: "mypassword"};
      process.env.TOKEN_EXPIRES_DAYS = oneSecond.toString();
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
            dbService.Token.findAll().then(function(tokens){
              assert.equal(tokens.length, 1);
              assert.equal(tokens[0].id, token);
              assert.equal(tokens[0].UserId, 1);
              setTimeout(function(){
                superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token="+token).end(function(err, result){
                  try {
                    assert.ok(err);
                    assert.equal(result.status, 401);
                    assert.equal(result.text, "Unauthorized");
                    dbService.Token.findAll().then(function(tokens){
                      assert.deepEqual(tokens, []);
                      done();
                    }).catch(done);
                  } catch(err) {done(err);}
                });
              }, 1000);
            }).catch(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should perform maintenance of expired tokens by deleting them', function (testDone) {
      this.timeout(4000);
      var done = function (err) {
        delete process.env.TOKEN_EXPIRES_DAYS;
        return testDone(err);
      }
      var userData = {username: "user01", password: "mypassword"};
      process.env.TOKEN_EXPIRES_DAYS = oneSecond.toString();
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
            dbService.Token.findAll().then(function(tokens){
              assert.equal(tokens.length, 1);
              assert.equal(tokens[0].id, token);
              assert.equal(tokens[0].UserId, 1);
              setTimeout(function(){
                dbService.deleteExpiredTokens().then(function(){
                  return dbService.Token.findAll().then(function(tokens){
                    assert.deepEqual(tokens, []);
                    done();
                  });
                }).catch(done);
              }, 1000);
            }).catch(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should retry token generation in case a generated token uuid is already in use', function (testDone) {
      var userData1 = {username: "user01", password: "mypassword"};
      var userData2 = {username: "user02", password: "mypassword2"};
      var defaultGenerator = uuid.v4;
      var done = function (err) {
        uuid.v4 = defaultGenerator;
        return testDone(err);
      };
      var generatorPattern = {1: "1", 2: "1", 3:"1", 4: "1", 5: "1", 6: "2"};
      var generatorCounter = 0;
      var brokenGenerator = function(){
        generatorCounter++;
        return generatorPattern[generatorCounter] || generatorCounter;
      };
      prepopulate().then(function(){
        uuid.v4 = brokenGenerator;
        authenticateUser(userData1, function(err, token1, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.equal(token1, "1");
            authenticateUser(userData2, function(err, token2, result){
              if(err) return done(err);
              try {
                assert.equal(result.status, 200);
                assert.equal(token2, "2");
                assert.equal(generatorCounter, 6);
                return dbService.Token.findAll().then(function(tokens){
                  assert.equal(tokens.length, 2);
                  assert.equal(tokens[0].id, "1");
                  assert.equal(tokens[0].UserId, 1);
                  assert.equal(tokens[1].id, "2");
                  assert.equal(tokens[1].UserId, 2);
                  done();
                });
              } catch(err) {done(err);}
            });
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should give up retrying token generation in case a generated token uuid is already in use if number of attempts is exceeded', function (testDone) {
      this.timeout(10000);
      var userData1 = {username: "user01", password: "mypassword"};
      var userData2 = {username: "user02", password: "mypassword2"};
      var defaultGenerator = uuid.v4;
      var done = function (err) {
        uuid.v4 = defaultGenerator;
        return testDone(err);
      };
      var generatorCounter = 0;
      var brokenGenerator = function(){
        generatorCounter++;
        return "1";
      };
      prepopulate().then(function(){
        uuid.v4 = brokenGenerator;
        authenticateUser(userData1, function(err, token1, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.equal(token1, "1");
            authenticateUser(userData2, function(err, token2, result){
              try {
                assert.ok(err);
                assert.equal(err.status, 500);
                assert.equal(!!token2, false);
                assert.equal(generatorCounter, 1 + 5);
                assert.deepEqual(err.response.body, {error:"server_error", error_description:i18n.__("Cannot create token")});
                return dbService.Token.findAll().then(function(tokens){
                  assert.equal(tokens.length, 1);
                  assert.equal(tokens[0].id, "1");
                  assert.equal(tokens[0].UserId, 1);
                  done();
                });
              } catch(err) {done(err);}
            });
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should reject authentication of an invalid user', function (done) {
      var userData = {username: "user01", password: "badpassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 500);
            assert.equal(err.response.body.error_description, i18n.__('Bad credentials'));
            assert.equal(!!token, false);
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should reject logout for a non-existing token', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
          } catch(err) {done(err);}
          dbService.Token.findAll().then(function(tokens){
            assert.equal(tokens.length, 1);
            assert.equal(tokens[0].id, token);
            assert.equal(tokens[0].UserId, 1);
            superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token=badtoken").end(function(err, result){
              try {
                assert.ok(err);
                assert.equal(result.status, 500);
                assert.deepEqual(result.body, {error:"server_error", error_description:i18n.__("Cannot delete non-existing token %s", 'badtoken')});
                dbService.Token.findAll().then(function(tokens){
                  assert.equal(tokens.length, 1);
                  assert.equal(tokens[0].id, token);
                  assert.equal(tokens[0].UserId, 1);
                  done();
                }).catch(done);
              } catch(err) {done(err);}
            });
          }).catch(done);
        });
      }).catch(done);
    });
  });
});
