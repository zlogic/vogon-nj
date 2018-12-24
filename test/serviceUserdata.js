var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/dbservice');
var prepopulate = require('./utils/prepopulate').prepopulate;
var superagent = require('superagent');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

describe('Service', function() {
  serviceBase.hooks();

  var validateDefaultUserdata = function(done){
    dbService.User.findAll().then(function(users){
      assert.equal(users.length, 2);
      assert.equal(users[0].username, 'user01');
      assert.equal(users[1].username, 'user02');
      return users[0].validatePassword('mypassword').then(function(passwordValid) {
        assert.equal(passwordValid, true);
        return users[1].validatePassword('mypassword2');
      }).then(function(passwordValid) {
        assert.equal(passwordValid, true);
        done();
      }).catch(done);
    }).catch(done);
  };

  describe('userdata', function () {
    it('should get details for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/user").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, { username: 'user01', version: 0 });
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should be able to change the username for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {username: "user03"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, { username: 'user03', version: 1 });
              dbService.User.findAll().then(function(users){
                assert.equal(users.length, 2);
                assert.equal(users[0].username, 'user03');
                assert.equal(users[1].username, 'user02');
                return users[0].validatePassword('mypassword').then(function(passwordValid) {
                  assert.equal(passwordValid, true);
                  return users[1].validatePassword('mypassword2');
                }).then(function(passwordValid) {
                  assert.equal(passwordValid, true);
                  done();
                }).catch(done);
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should be able to change the password for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {password: "mypassword1"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, { username: 'user01', version: 1 });
              dbService.User.findAll().then(function(users){
                assert.equal(users.length, 2);
                assert.equal(users[0].username, 'user01');
                assert.equal(users[1].username, 'user02');
                return users[0].validatePassword('mypassword1').then(function(passwordValid) {
                  assert.equal(passwordValid, true);
                  return users[1].validatePassword('mypassword2');
                }).then(function(passwordValid) {
                  assert.equal(passwordValid, true);
                  done();
                }).catch(done);
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should be able to change the username and password for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {username: "user03", password: "mypassword1"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, { username: 'user03', version: 1 });
              dbService.User.findAll().then(function(users){
                assert.equal(users.length, 2);
                assert.equal(users[0].username, 'user03');
                assert.equal(users[1].username, 'user02');
                return users[0].validatePassword('mypassword1').then(function(passwordValid) {
                  assert.equal(passwordValid, true);
                  return users[1].validatePassword('mypassword2');
                }).then(function(passwordValid) {
                  assert.equal(passwordValid, true);
                  done();
                }).catch(done);
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not be able to change the username for an authenticated user if the username is already in use', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {username: "user02"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            try {
              assert.ok(err);
              assert.equal(result.status, 500);
              assert.deepEqual(result.text, 'Validation error');
              validateDefaultUserdata(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not be able to change the username for an authenticated user if the new username is empty', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {username: ""};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            try {
              assert.ok(err);
              assert.equal(result.status, 500);
              assert.deepEqual(result.text, 'Validation error: Validation notEmpty on username failed');
              validateDefaultUserdata(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not be able to change the password for an authenticated user if the new password is empty', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {password: ""};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            try {
              assert.ok(err);
              assert.equal(result.status, 500);
              assert.deepEqual(result.text, 'Validation error: Validation notEmpty on password failed');
              validateDefaultUserdata(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should ignore id in requests for getting user data and use OAuth data instead', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/user").set(tokenHeader(token)).send({id: 2}).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, { username: 'user01', version: 0 });
              done();
            } catch(err) {done(err);}
          });
        });
      });
    });
    it('should ignore id in requests for changing user data and use OAuth data instead', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {username: "user03", password: "mypassword1", id: 2};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, { username: 'user03', version: 1 });
              dbService.User.findAll().then(function(users){
                assert.equal(users.length, 2);
                assert.equal(users[0].username, 'user03');
                assert.equal(users[1].username, 'user02');
                return users[0].validatePassword('mypassword1').then(function(passwordValid) {
                  assert.equal(passwordValid, true);
                  return users[1].validatePassword('mypassword2');
                }).then(function(passwordValid) {
                  assert.equal(passwordValid, true);
                  done();
                }).catch(done);
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      });
    });
    it('should not be able to get user data for an unauthenticated user (no token)' , function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/service/user").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get user data for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.get(baseUrl + "/service/user").set(tokenHeader(token)).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to change user data for an unauthenticated user (no token)' , function (done) {
      var newUserData = {username: "user03", password: "mypassword1", id: 2};
      prepopulate().then(function(){
        superagent.get(baseUrl + "/service/user").send(newUserData).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            validateDefaultUserdata(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to change user data for an unauthenticated user (bad token)', function (done) {
      var newUserData = {username: "user03", password: "mypassword1", id: 2};
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.get(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            validateDefaultUserdata(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
  });
});
