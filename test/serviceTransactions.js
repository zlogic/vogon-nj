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

  var validateDefaultFinanceTransactionsData = function(done){
    var defaultFinanceTransactions = [
      { UserId: 1, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
        {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
      ] },
      { UserId: 1, tags: [], id: 2, type: 'expenseincome', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
      { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
        {AccountId: 2, amount: 3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1},
      ] },
      { UserId: 2, tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 0, FinanceTransactionComponents: [
        {AccountId: 3, amount: 100, id: 5, version: 1}
      ] }
    ];
    dbService.FinanceTransaction.findAll({
      model: dbService.FinanceTransaction,
      include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}],
      order: [
        ['id', 'ASC'],
        [dbService.FinanceTransactionComponent, 'id', 'ASC']
      ]
    }).then(function(financeTransactions){
      financeTransactions = financeTransactions.map(function(financeTransaction){return financeTransaction.toJSON();});
      assert.deepEqual(financeTransactions, defaultFinanceTransactions);
      done();
    }).catch(done);
  };

  describe('transactionslist', function () {
    it('should get a list of transactions for an authenticated user with default sort parameters', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
                  {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: 3.14, id: 3, version: 1}
                ] },
                { tags: [], id: 2, type: 'expenseincome', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
                { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
                  {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
                ] }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of transactions for an authenticated user with sort by date descending', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?sortColumn=date&sortDirection=DESC").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
                  {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: 3.14, id: 3, version: 1}
                ] },
                { tags: [], id: 2, type: 'expenseincome', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
                { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
                  {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
                ] }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of transactions for an authenticated user with sort by date ascending', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?sortColumn=date&sortDirection=ASC").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
                  {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
                ] },
                { tags: [], id: 2, type: 'expenseincome', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
                { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
                  {AccountId: 2, amount: 3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1}
                ] }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of transactions for an authenticated user with sort by description descending', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?sortColumn=description&sortDirection=DESC").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { tags: [], id: 2, type: 'expenseincome', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
                { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
                  {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: 3.14, id: 3, version: 1}
                ] },
                { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
                  {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
                ] }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of transactions for an authenticated user with sort by description ascending', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?sortColumn=description&sortDirection=ASC").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
                  {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
                ] },
                { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
                  {AccountId: 2, amount: 3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1}
                ] },
                { tags: [], id: 2, type: 'expenseincome', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of transactions for an authenticated user with a date filter for an existing date', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?filterDate=2014-02-17").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { tags: [], id: 2, type: 'expenseincome', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
                { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
                  {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
                ] }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of transactions for an authenticated user with a date filter for a non-existing date', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?filterDate=1970-01-01").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, []);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of transactions for an authenticated user with a tag filter for an existing tag', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?filterTags=[\"hello\"]").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
                  {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: 3.14, id: 3, version: 1}
                ] },
                { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
                  {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
                ] }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of transactions for an authenticated user with a tag filter for a non-existing tag', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?filterDate=[\"unknown\"]").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, []);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of transactions for an authenticated user with a description filter for an existing description', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?filterDescription=%25transaction 2%25").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
                  {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: 3.14, id: 3, version: 1}
                ] }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of transactions for an authenticated user with a description filter for a non-existing description', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?filterDescription=%25transaction 4%25").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, []);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should handle paging for transactions', function (done) {
      this.timeout(5000);
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        var newTransactions = [];
        for(var i=1;i<250;i++)
          newTransactions.push({description: "page transaction "+i,});
        return dbService.sequelize.transaction(function(transaction){
          return dbService.FinanceTransaction.bulkCreate(newTransactions, {transaction: transaction, hooks: true});
        });
      }).then(function(){
        return dbService.sequelize.transaction(function(transaction){
          return dbService.User.find({where: {username:"user01"}, transaction:transaction}).then(function(user){
            return dbService.FinanceTransaction.findAll({transaction:transaction}).then(function(financeTransactions){
              return dbService.sequelize.Promise.all(financeTransactions.map(function(financeTransaction){
                return financeTransaction.setUser(user, {transaction:transaction});
              }));;
            });
          });
        });
      }).then(function(){
        var pageTransactions = [];
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions?page=0").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.equal(result.body.length, 100);
              pageTransactions = pageTransactions.concat(result.body);
              superagent.get(baseUrl + "/service/transactions?page=1").set(tokenHeader(token)).end(function(err, result){
                if(err) return done(err);
                try {
                  assert.ok(result);
                  assert.equal(result.status, 200);
                  assert.equal(result.body.length, 100);
                  pageTransactions = pageTransactions.concat(result.body);
                  superagent.get(baseUrl + "/service/transactions?page=2").set(tokenHeader(token)).end(function(err, result){
                    if(err) return done(err);
                    try {
                      assert.ok(result);
                      assert.equal(result.status, 200);
                      assert.equal(result.body.length, 53);
                      pageTransactions = pageTransactions.concat(result.body);
                      assert.equal(pageTransactions.some(function(tr){return tr.description === "test transaction 1";}), true);
                      assert.equal(pageTransactions.some(function(tr){return tr.description === "test transaction 2";}), true);
                      assert.equal(pageTransactions.some(function(tr){return tr.description === "test transaction 3";}), true);
                      for(var i=1;i<250;i++)
                        assert.equal(pageTransactions.some(function(tr){return tr.description === "page transaction " + i;}), true);
                      done();
                    } catch(err) {done(err);}
                  });
                } catch(err) {done(err);}
              });
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should ignore UserId in requests for getting a list of transactions and use OAuth data instead', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions").set(tokenHeader(token)).send({UserId: 2}).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [
                { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
                  {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: 3.14, id: 3, version: 1}
                ] },
                { tags: [], id: 2, type: 'expenseincome', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
                { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
                  {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
                ] }
              ]);
              done();
            } catch(err) {done(err);}
          });
        });
      });
    });
    it('should not be able to get a list of transactions for an unauthenticated user (no token)' , function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/service/transactions").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get a list of transactions for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.get(baseUrl + "/service/transactions").set(tokenHeader(token)).end(function(err, result){
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

  describe('transaction', function () {
    it('should get a specific requested transaction for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions/transaction/1").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, {
                tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
                  {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
                ]
              });
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should delete a specific requested transaction for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var finalFinanceTransactions = [
        { UserId: 1, tags: [], id: 2, type: 'expenseincome', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: 3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1},
        ] },
        { UserId: 2, tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 3, amount: 100, id: 5, version: 1}
        ] }
      ];
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.delete(baseUrl + "/service/transactions/transaction/1").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, {
                tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
                  {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
                ]
              });
              dbService.FinanceTransaction.findAll({
                model: dbService.FinanceTransaction,
                include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}],
                order: [
                  ['id', 'ASC'],
                  [dbService.FinanceTransactionComponent, 'id', 'ASC']
                ]
              }).then(function(financeTransactions){
                financeTransactions = financeTransactions.map(function(financeTransaction){return financeTransaction.toJSON();});
                assert.deepEqual(financeTransactions, finalFinanceTransactions);
                done();
              }).catch(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not allow an authenticated user to get a specific requested transaction beloging to another user', function (done) {
      var userData = {username: "user02", password: "mypassword2"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/transactions/transaction/1").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, {});
              done();
            } catch(err) {done(err);}
          });
        });
      });
    });
    it('should not allow an authenticated user to delete a specific requested transaction beloging to another user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.delete(baseUrl + "/service/transactions/transaction/4").set(tokenHeader(token)).end(function(err, result){
            try {
              assert.ok(err);
              assert.equal(result.status, 500);
              assert.deepEqual(result.text, i18n.__('Cannot delete non-existing transaction'));
              validateDefaultFinanceTransactionsData(done);
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not be able to get a specific requested transaction for an unauthenticated user (no token)' , function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/service/transactions/transaction/1").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get a specific requested transaction for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.get(baseUrl + "/service/transactions/transaction/1").set(tokenHeader(token)).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to delete a specific requested transaction for an unauthenticated user (no token)' , function (done) {
      prepopulate().then(function(){
        superagent.delete(baseUrl + "/service/transactions/transaction/1").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            validateDefaultFinanceTransactionsData(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to delete a specific requested transaction for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.delete(baseUrl + "/service/transactions/transaction/1").set(tokenHeader(token)).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            validateDefaultFinanceTransactionsData(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
  });
});
