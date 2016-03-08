var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/model');
var prepopulate = require('./utils/prepopulate').prepopulateExtra;
var superagent = require('superagent');
var i18n = require('i18n');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

describe('Service', function() {
  serviceBase.hooks();

  describe('analytics', function () {
    it('should get a list of all tags for an authenticated user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/analytics/tags").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, ["","hello","world","magic"]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get a list of all tags for an authenticated user with no tags', function (done) {
      var userData = {username: "user02", password: "mypassword2"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/analytics/tags").set(tokenHeader(token)).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, [""]);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get analytics data for all transactions', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: true,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2]
      };
      var expectedAnalytics = {
        RUB: {
          financeTransactions: [
            {description:"test transaction 4",date:"2014-06-07",type:"transfer",amount:144},
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:42},
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:2.72}
          ],
          tagExpenses: [{tag:"",amount:144},{tag:"hello",amount:42 + 2.72},{tag:"world",amount:42},{tag:"magic",amount:2.72}],
          accountsBalanceGraph: {"2014-02-17":42,"2014-06-07":42-144,"2015-01-07":42-144+2.72}
        },
        EUR: {
          financeTransactions: [
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:160},
            {description:"test transaction 4",date:"2014-06-07",type:"transfer",amount:144},
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:-3.14}
          ],
          tagExpenses:[{tag:"world",amount:160},{tag:"hello",amount:160 - 3.14},{tag:"",amount:144},{tag:"magic",amount:-3.14}],
          accountsBalanceGraph:{"2014-02-17":160,"2014-06-07":160+144,"2015-01-07":160+144-3.14}
        }
      };
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAnalytics);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get analytics data for only income transactions', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: false,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: false,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2]
      };
      var expectedAnalytics = {
        RUB: {
          financeTransactions: [
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:42},
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:2.72}
          ],
          tagExpenses: [{tag:"hello",amount:42 + 2.72},{tag:"world",amount:42},{tag:"magic",amount:2.72}],
          accountsBalanceGraph: {"2014-02-17":42,"2015-01-07":42+2.72}
        },
        EUR: {
          financeTransactions: [
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:160}
          ],
          tagExpenses:[{tag:"hello",amount:160},{tag:"world",amount:160}],
          accountsBalanceGraph:{"2014-02-17":160}
        }
      };
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAnalytics);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get analytics data for only expense transactions', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: false,
        enabledIncomeTransactions: false,
        enabledExpenseTransactions: true,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2]
      };
      var expectedAnalytics = {
        RUB: {
          financeTransactions: [],
          tagExpenses: [],
          accountsBalanceGraph: {}
        },
        EUR: {
          financeTransactions: [
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:-3.14}
          ],
          tagExpenses:[{tag:"hello",amount:-3.14},{tag:"magic",amount:-3.14}],
          accountsBalanceGraph:{"2015-01-07":-3.14}
        }
      };
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAnalytics);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get analytics data for only transfer transactions', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: false,
        enabledExpenseTransactions: false,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2]
      };
      var expectedAnalytics = {
        RUB: {
          financeTransactions: [
            {description:"test transaction 4",date:"2014-06-07",type:"transfer",amount:144}
          ],
          tagExpenses: [{tag:"",amount:144}],
          accountsBalanceGraph: {"2014-06-07":-144}
        },
        EUR: {
          financeTransactions: [
            {description:"test transaction 4",date:"2014-06-07",type:"transfer",amount:144},
          ],
          tagExpenses:[{tag:"",amount:144}],
          accountsBalanceGraph:{"2014-06-07":144}
        }
      };
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAnalytics);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get analytics data for transactions at a specific day', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var request = {
        earliestDate: "2014-02-17",
        latestDate: "2014-02-17",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: true,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2]
      };
      var expectedAnalytics = {
        RUB: {
          financeTransactions: [
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:42}
          ],
          tagExpenses: [{tag:"hello",amount:42},{tag:"world",amount:42}],
          accountsBalanceGraph: {"2014-02-17":42}
        },
        EUR: {
          financeTransactions: [
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:160},
          ],
          tagExpenses:[{tag:"hello",amount:160},{tag:"world",amount:160}],
          accountsBalanceGraph:{"2014-02-17":160}
        }
      };
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAnalytics);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get analytics data for transactions in a specific account', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: true,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1]
      };
      var expectedAnalytics = {
        RUB: {
          financeTransactions: [
            {description:"test transaction 4",date:"2014-06-07",type:"transfer",amount:144},
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:42},
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:2.72}
          ],
          tagExpenses: [{tag:"",amount:144},{tag:"hello",amount:42 + 2.72},{tag:"world",amount:42},{tag:"magic",amount:2.72}],
          accountsBalanceGraph: {"2014-02-17":42,"2014-06-07":42-144,"2015-01-07":42-144+2.72}
        }
      };
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAnalytics);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should get analytics data for transactions with a specific tag', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: true,
        selectedTags: ["magic"],
        selectedAccounts: [1, 2]
      };
      var expectedAnalytics = {
        RUB: {
          financeTransactions: [
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:2.72}
          ],
          tagExpenses: [{tag:"hello",amount:2.72},{tag:"magic",amount:2.72}],
          accountsBalanceGraph: {"2015-01-07":2.72}
        },
        EUR: {
          financeTransactions: [
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:-3.14}
          ],
          tagExpenses:[{tag:"hello",amount:-3.14},{tag:"magic",amount:-3.14}],
          accountsBalanceGraph:{"2015-01-07":-3.14}
        }
      };
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAnalytics);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should ignore UserId in requests for getting a list of all tags and use OAuth data instead', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.get(baseUrl + "/service/analytics/tags").set(tokenHeader(token)).send({UserId: 2}).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, ["","hello","world","magic"]);
              done();
            } catch(err) {done(err);}
          });
        });
      });
    });
    it('should ignore UserId in requests for getting analytics and use OAuth data instead', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var request = {
        UserId: 2,
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: true,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2]
      };
      var expectedAnalytics = {
        RUB: {
          financeTransactions: [
            {description:"test transaction 4",date:"2014-06-07",type:"transfer",amount:144},
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:42},
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:2.72}
          ],
          tagExpenses: [{tag:"",amount:144},{tag:"hello",amount:42 + 2.72},{tag:"world",amount:42},{tag:"magic",amount:2.72}],
          accountsBalanceGraph: {"2014-02-17":42,"2014-06-07":42-144,"2015-01-07":42-144+2.72}
        },
        EUR: {
          financeTransactions: [
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:160},
            {description:"test transaction 4",date:"2014-06-07",type:"transfer",amount:144},
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:-3.14}
          ],
          tagExpenses:[{tag:"world",amount:160},{tag:"hello",amount:160 - 3.14},{tag:"",amount:144},{tag:"magic",amount:-3.14}],
          accountsBalanceGraph:{"2014-02-17":160,"2014-06-07":160+144,"2015-01-07":160+144-3.14}
        }
      };
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAnalytics);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not allow a user to use an AccountId belonging to another user in requests for getting analytics', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: true,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2, 3]
      };
      var expectedAnalytics = {
        RUB: {
          financeTransactions: [
            {description:"test transaction 4",date:"2014-06-07",type:"transfer",amount:144},
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:42},
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:2.72}
          ],
          tagExpenses: [{tag:"",amount:144},{tag:"hello",amount:42 + 2.72},{tag:"world",amount:42},{tag:"magic",amount:2.72}],
          accountsBalanceGraph: {"2014-02-17":42,"2014-06-07":42-144,"2015-01-07":42-144+2.72}
        },
        EUR: {
          financeTransactions: [
            {description:"test transaction 1",date:"2014-02-17",type:"expenseincome",amount:160},
            {description:"test transaction 4",date:"2014-06-07",type:"transfer",amount:144},
            {description:"test transaction 2",date:"2015-01-07",type:"expenseincome",amount:-3.14}
          ],
          tagExpenses:[{tag:"world",amount:160},{tag:"hello",amount:160 - 3.14},{tag:"",amount:144},{tag:"magic",amount:-3.14}],
          accountsBalanceGraph:{"2014-02-17":160,"2014-06-07":160+144,"2015-01-07":160+144-3.14}
        }
      };
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request).end(function(err, result){
            if(err) return done(err);
            try {
              assert.ok(result);
              assert.equal(result.status, 200);
              assert.deepEqual(result.body, expectedAnalytics);
              done();
            } catch(err) {done(err);}
          });
        });
      }).catch(done);
    });
    it('should not be able to get analytics for an unauthenticated user (no token)' , function (done) {
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: true,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2]
      };
      prepopulate().then(function(){
        superagent.post(baseUrl + "/service/analytics").send(request).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get a list of all tags for an unauthenticated user (no token)' , function (done) {
      prepopulate().then(function(){
        superagent.get(baseUrl + "/service/analytics/tags").end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get a list of all tags for an unauthenticated user (bad token)', function (done) {
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.get(baseUrl + "/service/analytics/tags").set(tokenHeader(token)).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 401);
            assert.equal(err.response.text, 'Unauthorized');
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should not be able to get analytics for an unauthenticated user (bad token)', function (done) {
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: true,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2]
      };
      prepopulate().then(function(){
        var token = 'aaaa';
        superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request).end(function(err, result){
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
