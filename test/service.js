var assert = require('assert');
var dbService = require('../services/model');
var fs = require('fs');
var logger = require('./utils/logger.js');
var prepopulate = require('./utils/prepopulate');
var superagent = require('superagent');
var i18n = require('i18n');
var dbConfiguration = require('./utils/dbconfiguration.js');
var i18nConfiguration = require('./utils/i18nconfiguration.js');

var app = require('../app');
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

  describe('registration', function () {
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
              assert.equal(users.length, 2);
              assert.equal(users[0].username, 'user01');
              assert.equal(users[1].username, 'user02');
              users[0].validatePassword('mypassword', function(err, passwordValid){
                if(err) return done(err);
                try {
                  assert.equal(passwordValid, true);
                  users[1].validatePassword('mypassword2', function(err, passwordValid){
                    if(err) return done(err);
                    try {
                      assert.equal(passwordValid, true);
                      done();
                    } catch (err) { done(err) };
                  });
                } catch (err) { done(err) };
              });
            }).catch(done)
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should accept authentication of a valid user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
            done();
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
  });

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
  });

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

  describe('transactions', function () {
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
});
