var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/model');
var prepopulate = require('./utils/prepopulate');
var superagent = require('superagent');
var i18n = require('i18n');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

describe('Service', function() {
  serviceBase.hooks();

  describe('accounts', function () {
    it('should get a list of accounts for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/accounts").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { balance: 44.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
                { balance: 163.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should ignore UserId in requests for getting a list of accounts and use OAuth data instead', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/accounts").set(tokenHeader(token)).send({UserId: 2}).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { balance: 44.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
                { balance: 163.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      });
    });
    it('should not be able to get a list of accounts for an unauthenticated user (no token)' , function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/service/accounts").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get a list of accounts for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.get(baseUrl + "/service/accounts").set(tokenHeader(token)).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
  });
});
