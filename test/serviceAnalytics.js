var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/dbservice');
var prepopulate = require('./utils/prepopulate').prepopulateExtra;
var superagent = require('superagent');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

describe('Service', function() {
  serviceBase.hooks();

  describe('analytics', function () {
    it('should get a list of all tags for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.get(baseUrl + "/service/analytics/tags").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, ["","hello","magic","world"]);
    });
    it('should get a list of all tags for an authenticated user with no tags', async function () {
      var userData = {username: "user02", password: "mypassword2"};
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.get(baseUrl + "/service/analytics/tags").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, [""]);
    });
    it('should get analytics data for all transactions', async function () {
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
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedAnalytics);
    });
    it('should get analytics data for only income transactions', async function () {
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
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedAnalytics);
    });
    it('should get analytics data for only expense transactions', async function () {
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
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedAnalytics);
    });
    it('should get analytics data for only transfer transactions', async function () {
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
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedAnalytics);
    });
    it('should get analytics data for transactions at a specific day', async function () {
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
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedAnalytics);
    });
    it('should get analytics data for transactions in a specific account', async function () {
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
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedAnalytics);
    });
    it('should get analytics data for transactions with a specific tag', async function () {
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
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedAnalytics);
    });
    it('should correctly handle an empty analytics request', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, {});
    });
    it('should not allow a user to use an AccountId belonging to another user in requests for getting analytics', async function () {
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
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedAnalytics);
    });
    it('should not be able to get analytics for an unauthenticated user (no token)', async function () {
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: true,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2]
      };
      await prepopulate();

      var error;
      try {
        await superagent.post(baseUrl + "/service/analytics").send(request);
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to get a list of all tags for an unauthenticated user (no token)', async function () {
      await prepopulate();

      var error;
      try {
        await superagent.get(baseUrl + "/service/analytics/tags");
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to get a list of all tags for an unauthenticated user (bad token)', async function () {
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.get(baseUrl + "/service/analytics/tags").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to get analytics for an unauthenticated user (bad token)', async function () {
      var request = {
        earliestDate: "2010-01-01",
        latestDate: "2020-01-01",
        enabledTransferTransactions: true,
        enabledIncomeTransactions: true,
        enabledExpenseTransactions: true,
        selectedTags: ["","hello","world","magic"],
        selectedAccounts: [1, 2]
      };
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.post(baseUrl + "/service/analytics").set(tokenHeader(token)).send(request);
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
  });
});
