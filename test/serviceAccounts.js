var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/model');
var prepopulate = require('./utils/prepopulate').prepopulate;
var superagent = require('superagent');
var i18n = require('i18n');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

describe('Service', function() {
  serviceBase.hooks();

  var validateDefaultAccountData = function(done){
    var defaultAccounts = [
      { UserId: 1, balance: 42 + 2.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
      { UserId: 1, balance: 160 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
      { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 }
    ];
    dbService.Account.findAll().then(function(accounts){
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, defaultAccounts);
      done();
    }).catch(done);
  };

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
                { balance: 42 + 2.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
                { balance: 160 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should be able to change the accounts for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var newAccountData = [
        { balance: 111, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 0 },
        { balance: 222, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { balance: 333, name: 'test account 4', currency: 'USD', includeInTotal: true, showInList: true, version: 0 }
      ];
      var expectedAccountData = [
        { balance: 42 + 2.72, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 1 },
        { balance: 0, id: 4, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 1 },
        { balance: 0, id: 5, name: 'test account 4', currency: 'USD', includeInTotal: true, showInList: true, version: 1 }
      ];
      var finalAccounts = [
        { UserId: 1, balance: 42 + 2.72, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 1 },
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 1, balance: 0, id: 4, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 1 },
        { UserId: 1, balance: 0, id: 5, name: 'test account 4', currency: 'USD', includeInTotal: true, showInList: true, version: 1 }
      ];
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/accounts").set(tokenHeader(token)).send(newAccountData).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAccountData);
              dbService.Account.findAll().then(function(accounts){
                accounts = accounts.map(function(account){return account.toJSON();});
                assert.deepEqual(accounts, finalAccounts)
                done();
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should be able to delete all accounts for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var finalAccounts = [
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 }
      ];
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/accounts").set(tokenHeader(token)).send([]).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, []);
              dbService.Account.findAll().then(function(accounts){
                accounts = accounts.map(function(account){return account.toJSON();});
                assert.deepEqual(accounts, finalAccounts)
                done();
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not be able to change the accounts for an authenticated user with incorrect version numbers', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var newAccountData = [
        { balance: 111, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 0 },
        { balance: 222, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 }
      ];
      var finalAccounts = [
        { UserId: 1, balance: 42 + 2.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 1 },
        { UserId: 1, balance: 160 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 1 },
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 1 }
      ];
      prepopulate().then(function(){
        return dbService.Account.update({version: 1}, {where: {}});
      }).then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/accounts").set(tokenHeader(token)).send(newAccountData).end(function(err, result){
            try {
              assert.ok(err);
              assert.equal(result.status, 500);
              assert.deepEqual(result.text, i18n.__('Data was already updated from another session'));
              dbService.Account.findAll().then(function(accounts){
                accounts = accounts.map(function(account){return account.toJSON();});
                assert.deepEqual(accounts, finalAccounts)
                done();
              }).catch(done);
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
                { balance: 42 + 2.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
                { balance: 160 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      });
    });
    it('should ignore UserId in requests for changing accounts and use OAuth data instead', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var newAccountData = [
        { UserId: 2, balance: 111, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 0 },
        { UserId: 2, balance: 222, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 333, name: 'test account 4', currency: 'USD', includeInTotal: true, showInList: true, version: 0 }
      ];
      var expectedAccountData = [
        { balance: 42 + 2.72, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 1 },
        { balance: 0, id: 4, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 1 },
        { balance: 0, id: 5, name: 'test account 4', currency: 'USD', includeInTotal: true, showInList: true, version: 1 }
      ];
      var finalAccounts = [
        { UserId: 1, balance: 42 + 2.72, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 1 },
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 1, balance: 0, id: 4, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 1 },
        { UserId: 1, balance: 0, id: 5, name: 'test account 4', currency: 'USD', includeInTotal: true, showInList: true, version: 1 }
      ];
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/accounts").set(tokenHeader(token)).send(newAccountData).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAccountData);
              dbService.Account.findAll().then(function(accounts){
                accounts = accounts.map(function(account){return account.toJSON();});
                assert.deepEqual(accounts, finalAccounts)
                done();
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
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
    it('should not be able to change accounts for an unauthenticated user (no token)', function (done) {
      var newAccountData = [
        { UserId: 2, balance: 111, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 0 },
        { UserId: 2, balance: 222, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 333, name: 'test account 4', currency: 'USD', includeInTotal: true, showInList: true, version: 0 }
      ];
      prepopulate().then(function(){
        superagent.post(baseUrl + "/service/accounts").send(newAccountData).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            validateDefaultAccountData(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get a list of accounts for an unauthenticated user (bad token)', function (done) {
      var newAccountData = [
        { UserId: 2, balance: 111, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 0 },
        { UserId: 2, balance: 222, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 333, name: 'test account 4', currency: 'USD', includeInTotal: true, showInList: true, version: 0 }
      ];
      var token = 'aaaa';
      prepopulate().then(function(){
        superagent.post(baseUrl + "/service/accounts").set(tokenHeader(token)).send(newAccountData).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            validateDefaultAccountData(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
  });
});
