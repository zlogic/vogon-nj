var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/model');
var prepopulate = require('./utils/prepopulate').prepopulate;
var superagent = require('superagent');
var i18n = require('i18n');
var fs = require('fs');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

describe('Service', function() {
  serviceBase.hooks();

  describe('export', function () {
    it('should export data for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var expectedExportData = {
        username: "user01",
        Accounts: [
          {
            id: 1,
            name: "test account 1",
            currency: "RUB",
            balance: 44.72,
            includeInTotal: true,
            showInList: true
          }, {
            id: 2,
            name: "test account 2",
            currency: "EUR",
            balance: 156.86,
            includeInTotal: true,
            showInList: true
          }
        ],
        FinanceTransactions: [
          {
            description: "test transaction 1",
            type: "expenseincome",
            date: "2014-02-17",
            tags: ["hello", "world"],
            FinanceTransactionComponents: [
              {amount: 42, AccountId: 1}, {amount: 160, AccountId: 2}
            ]
          }, {
            description: "test transaction 3",
            type: "transfer",
            date: "2014-02-17",
            tags: [],
            FinanceTransactionComponents: []
          }, {
            description: "test transaction 2",
            type: "expenseincome",
            date: "2015-01-07",
            tags: ["hello","magic"],
            FinanceTransactionComponents: [
              {amount: -3.14, AccountId: 2}, {amount: 2.72, AccountId: 1}
            ]
          }
        ]
      };
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/export").send("access_token=" + token).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedExportData);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should export data for an authenticated user with an empty account', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var expectedExportData = {
        username: "user01",
        Accounts: [],
        FinanceTransactions: []
      };
      dbService.User.create({
        username: "user01",
        password: "mypassword"
      }).then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/export").send("access_token=" + token).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedExportData);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not be able to export data for an unauthenticated user (no token)' , function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/service/export").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to export data for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.post(baseUrl + "/service/export").set(tokenHeader(token)).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to export data for an unauthenticated user (bad access_token)' , function (done) {
      prepopulate().then(function(){
        superagent.post(baseUrl + "/service/export").send('access_token=aaaa').end(function(err, result){
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

  describe('import', function () {
    it('should import data for an authenticated user with an empty account', function (done) {
      this.timeout(4000);
      var userData = {username: "user03", password: "mypassword3"};
      var expectedUsers = [
        {
          username: 'user01',
          id: 1,
          version: 0,
          Accounts: [
            {
              name: "test account 1",
              currency: "RUB",
              includeInTotal: true,
              showInList: true,
              version: 0,
              balance: 42+2.72
            }, {
              name: "test account 2",
              currency: "EUR",
              includeInTotal: true,
              showInList: true,
              version: 0,
              balance: 160-3.14
            }
          ],
          FinanceTransactions: [
            { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
              {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
            ] },
            { tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
            { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
              {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1},
            ] },
          ]
        }, {
          username: 'user02',
          id: 2,
          version: 0,
          Accounts: [
            {
              name: "test account 3",
              currency: "RUB",
              includeInTotal: true,
              showInList: true,
              version: 0,
              balance: 100
            }
          ],
          FinanceTransactions: [
            { tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 0, FinanceTransactionComponents: [
              {AccountId: 3, amount: 100, id: 5, version: 1}
            ] }
          ]
        }
      ];
      var importData =
      prepopulate().then(function(){
        return dbService.User.create({
          username: "user03",
          password: "mypassword3"
        });
      }).then(function(){
        return fs.readFile("./test/data/vogon-nodejs-export.json", function(error, importData){
          if(error) return done(err);
          var user3 = JSON.parse(importData);
          user3.username = "user03";
          user3.id = 3;
          user3.version = 0;
          user3.Accounts.sort(function(a,b){return a.id - b.id;});
          user3.Accounts.forEach(function(account){
            account.version = 0;
            delete account.id;
          });
          user3.FinanceTransactions.sort(function(a,b){return a.id - b.id;});
          user3.FinanceTransactions.forEach(function(financeTransaction){
            financeTransaction.version = 0;
            financeTransaction.id += 4;
            financeTransaction.tags.sort();
            financeTransaction.FinanceTransactionComponents.sort(function(a,b){return a.id - b.id;});
            financeTransaction.FinanceTransactionComponents.forEach(function(financeTransactionComponent){
              financeTransactionComponent.version = 1;
              financeTransactionComponent.AccountId += 3;
              financeTransactionComponent.id += 5;
            });
          });
          expectedUsers.push(user3);
          authenticateUser(userData, function(err, token, result){
            if(err) return done(err);
            superagent.post(baseUrl + "/service/import").set(tokenHeader(token)).attach("file","./test/data/vogon-nodejs-export.json").end(function(err, result){
              if(err) return done(err);
              try {
                assert.ok(result);
                assert.equal(result.status, 200);
                assert.deepEqual(result.body, true);
                dbService.User.findAll({
                  model: dbService.User,
                  include: [{
                    model: dbService.FinanceTransaction, attributes: {exclude: ['UserId']},
                    include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}]
                  }, {
                    model: dbService.Account, attributes: {exclude: ['id','UserId','FinanceTransactionComponents']}
                  }],
                  order: [
                    ['id', 'ASC'],
                    [dbService.FinanceTransaction, 'id', 'ASC'],
                    [dbService.Account, 'id', 'ASC'],
                    [dbService.FinanceTransaction, dbService.FinanceTransactionComponent, 'id', 'ASC']
                  ]
                }).then(function(users){
                  usersJson = users.map(function(user){return user.toJSON();});
                  usersJson.forEach(function(user){ delete user.password; });
                  assert.deepEqual(usersJson, expectedUsers);
                  users[0].validatePassword('mypassword', function(err, passwordValid){
                    if(err) return done(err);
                    try {
                      assert.equal(passwordValid, true);
                      users[1].validatePassword('mypassword2', function(err, passwordValid){
                        if(err) return done(err);
                        try {
                          assert.equal(passwordValid, true);
                          users[2].validatePassword('mypassword3', function(err, passwordValid){
                            if(err) return done(err);
                            try {
                              assert.equal(passwordValid, true);
                              done();
                            } catch (err) { done(err) };
                          });
                        } catch (err) { done(err) };
                      });
                    } catch (err) { done(err) };
                  });
                }).catch(done);
              } catch(err) {done(err);}
            });
          });
        });
      }).catch(done);
    });
    it('should not be able to import data for an unauthenticated user (no token)' , function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/service/import").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to import data for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.post(baseUrl + "/service/import").set(tokenHeader(token)).end(function(err, result){
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
