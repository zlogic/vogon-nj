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

  var validateDefaultFinanceTransactionsData = async function(){
    var defaultFinanceTransactions = [
      { UserId: 1, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
        {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
      ] },
      { UserId: 1, tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
      { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
        {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1},
      ] },
      { UserId: 2, tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 0, FinanceTransactionComponents: [
        {AccountId: 3, amount: 100, id: 5, version: 1}
      ] }
    ];
    var financeTransactions = await dbService.FinanceTransaction.findAll({
      model: dbService.FinanceTransaction,
      include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}],
      order: [
        ['id', 'ASC'],
        [dbService.FinanceTransactionComponent, 'id', 'ASC']
      ]
    });
    financeTransactions = financeTransactions.map(function(financeTransaction){return financeTransaction.toJSON();});
    assert.deepEqual(financeTransactions, defaultFinanceTransactions);
  };

  describe('transactionslist', function () {
    it('should get a list of transactions for an authenticated user with default sort parameters', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, [
        { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: -3.14, id: 3, version: 1}
        ] },
        { tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
        ] }
      ]);
    });
    it('should get a list of transactions for an authenticated user with sort by date descending', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?sortColumn=date&sortDirection=DESC").set(tokenHeader(token))
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, [
        { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: -3.14, id: 3, version: 1}
        ] },
        { tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
        ] }
      ]);
    });
    it('should get a list of transactions for an authenticated user with sort by date ascending', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?sortColumn=date&sortDirection=ASC").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, [
        { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
        ] },
        { tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1}
        ] }
      ]);
    });
    it('should get a list of transactions for an authenticated user with sort by description descending', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?sortColumn=description&sortDirection=DESC").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, [
        { tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: -3.14, id: 3, version: 1}
        ] },
        { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
        ] }
      ]);
    });
    it('should get a list of transactions for an authenticated user with sort by description ascending', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?sortColumn=description&sortDirection=ASC").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, [
        { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
        ] },
        { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1}
        ] },
        { tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] }
      ]);
    });
    it('should get a list of transactions for an authenticated user with a date filter for an existing date', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?filterDate=2014-02-17").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, [
        { tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
        ] }
      ]);
    });
    it('should get a list of transactions for an authenticated user with a date filter for a non-existing date', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?filterDate=1970-01-01").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, []);
    });
    it('should get a list of transactions for an authenticated user with a tag filter for an existing tag', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?filterTags=[\"hello\"]").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, [
        { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: -3.14, id: 3, version: 1}
        ] },
        { tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: 160, id: 2, version: 1}, {AccountId: 1, amount: 42, id: 1, version: 1}
        ] }
      ]);
    });
    it('should get a list of transactions for an authenticated user with a tag filter for a non-existing tag', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?filterDate=[\"unknown\"]").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, []);
    });
    it('should get a list of transactions for an authenticated user with a description filter for an existing description', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?filterDescription=%25transaction 2%25").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, [
        { tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 2.72, id: 4, version: 1}, {AccountId: 2, amount: -3.14, id: 3, version: 1}
        ] }
      ]);
    });
    it('should result in a full tag match if a tag begins with a quote', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var newTransactions = [
        {description: "test transaction 4", type: "expenseincome", date: "2014-06-07", tags: ["prefix\"\"quote_start","world"]},
        {description: "test transaction 5", type: "expenseincome", date: "2014-06-07", tags: [" hello","\"quote_middle"]},
      ];
      var cleanTransactions = function(financeTransactions){
        financeTransactions.forEach(function(financeTransaction) {
          delete financeTransaction.id;
          delete financeTransaction.version;
          delete financeTransaction.FinanceTransactionComponents;
        });
      };
      await prepopulate();

      var financeTransactions = await dbService.sequelize.transaction(function(transaction){
        return dbService.FinanceTransaction.bulkCreate(newTransactions, {transaction: transaction, hooks: true});
      });
      await dbService.sequelize.transaction(async function(transaction){
        var user = await dbService.User.findOne({where: {username:"user01"}, transaction:transaction});
        return Promise.all(financeTransactions.map(function(financeTransaction){
          return financeTransaction.setUser(user, {transaction:transaction});
        }));
      });

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?filterTags=[\"\\\"quote_start\"]").set(tokenHeader(token))
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, []);

      result = await superagent.get(baseUrl + "/service/transactions?filterTags=[\"prefix\\\"\\\"quote_start\"]").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      cleanTransactions(result.body);
      assert.deepEqual(result.body, [newTransactions[0]]);

      result = await superagent.get(baseUrl + "/service/transactions?filterTags=[\"\\\"quote_middle\"]").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      cleanTransactions(result.body);
      assert.deepEqual(result.body, [newTransactions[1]]);
    });
    it('should result in a full tag match if a tag ends with a quote', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var newTransactions = [
        {description: "test transaction 4", type: "expenseincome", date: "2014-06-07", tags: [" hello","prefix\"\"quote_middle"]},
        {description: "test transaction 6", type: "expenseincome", date: "2014-06-07", tags: ["hello","quote_end\""]},
      ];
      var cleanTransactions = function(financeTransactions){
        financeTransactions.forEach(function(financeTransaction) {
          delete financeTransaction.id;
          delete financeTransaction.version;
          delete financeTransaction.FinanceTransactionComponents;
        });
      };
      await prepopulate();

      var financeTransactions = await dbService.sequelize.transaction(function(transaction){
        return dbService.FinanceTransaction.bulkCreate(newTransactions, {transaction: transaction, hooks: true});
      });
      await dbService.sequelize.transaction(async function(transaction){
        var user = await dbService.User.findOne({where: {username:"user01"}, transaction:transaction});
        return Promise.all(financeTransactions.map(function(financeTransaction){
          return financeTransaction.setUser(user, {transaction:transaction});
        }));
      });

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?filterTags=[\"\\\"quote_middle\"]").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, []);

      result = await superagent.get(baseUrl + "/service/transactions?filterTags=[\"prefix\\\"\\\"quote_middle\"]").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      cleanTransactions(result.body);
      assert.deepEqual(result.body, [newTransactions[0]]);

      result = await superagent.get(baseUrl + "/service/transactions?filterTags=[\"quote_end\\\"\"]").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      cleanTransactions(result.body);
      assert.deepEqual(result.body, [newTransactions[1]]);
    });
    it('should get a list of transactions for an authenticated user with a description filter for a non-existing description', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?filterDescription=%25transaction 4%25").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, []);
    });
    it('should handle paging for transactions', async function () {
      this.timeout(5000);
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var newTransactions = [];
      for(var i=1;i<250;i++)
        newTransactions.push({description: "page transaction "+i,});
      await dbService.sequelize.transaction(function(transaction){
        return dbService.FinanceTransaction.bulkCreate(newTransactions, {transaction: transaction, hooks: true});
      });
      await dbService.sequelize.transaction(async function(transaction){
        var user = await dbService.User.findOne({where: {username:"user01"}, transaction:transaction});
        var financeTransactions = await dbService.FinanceTransaction.findAll({transaction:transaction});
        return Promise.all(financeTransactions.map(function(financeTransaction){
          return financeTransaction.setUser(user, {transaction:transaction});
        }));
      });
      var pageTransactions = [];

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?page=0").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.equal(result.body.length, 100);
      pageTransactions = pageTransactions.concat(result.body);

      result = await superagent.get(baseUrl + "/service/transactions?page=1").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.equal(result.body.length, 100);
      pageTransactions = pageTransactions.concat(result.body);

      result = await superagent.get(baseUrl + "/service/transactions?page=2").set(tokenHeader(token))
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.equal(result.body.length, 53);
      pageTransactions = pageTransactions.concat(result.body);
      assert.equal(pageTransactions.some(function(tr){return tr.description === "test transaction 1";}), true);
      assert.equal(pageTransactions.some(function(tr){return tr.description === "test transaction 2";}), true);
      assert.equal(pageTransactions.some(function(tr){return tr.description === "test transaction 3";}), true);
      for(var i=1;i<250;i++)
        assert.equal(pageTransactions.some(function(tr){return tr.description === "page transaction " + i;}), true);
    });
    it('should return an empty list for a non-existing page', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions?page=2").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, []);
    });
    it('should not be able to get a list of transactions for an unauthenticated user (no token)', async function () {
      await prepopulate();

      var error;
      try {
        await superagent.get(baseUrl + "/service/transactions");
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to get a list of transactions for an unauthenticated user (bad token)', async function () {
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.get(baseUrl + "/service/transactions").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
  });

  describe('transactionchange', function () {
    it('should be able to change a transaction for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var updatedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: 42, id: 2, version: 1}, {AccountId: 2, amount: 15}
        ]
      };
      var expectedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 1, FinanceTransactionComponents: [
          {AccountId: 2, amount: 42, id: 2, version: 2}, {AccountId: 2, amount: 15, id: 6, version: 1}
        ]
      };
      var finalFinanceTransactions = [
        { UserId: 1, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 1, FinanceTransactionComponents: [
          {AccountId: 2, amount: 42, id: 2, version: 2}, {AccountId: 2, amount: 15, id: 6, version: 1}
        ] },
        { UserId: 1, tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1},
        ] },
        { UserId: 2, tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 3, amount: 100, id: 5, version: 1}
        ] }
      ];
      var finalAccounts = [
        { UserId: 1, balance: 2.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 1, balance: 42 + 15 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 }
      ];
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.post(baseUrl + "/service/transactions").set(tokenHeader(token)).send(updatedTransactionData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedTransactionData);
      var financeTransactions = await dbService.FinanceTransaction.findAll({
        model: dbService.FinanceTransaction,
        include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}],
        order: [
          ['id', 'ASC'],
          [dbService.FinanceTransactionComponent, 'id', 'ASC']
        ]
      });
      financeTransactions = financeTransactions.map(function(financeTransaction){return financeTransaction.toJSON();});
      assert.deepEqual(financeTransactions, finalFinanceTransactions);
      var accounts = await dbService.Account.findAll();
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, finalAccounts);
    });
    it('should be able to create a new transaction for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var updatedTransactionData = {
        tags: ['hello','super'], type: 'expenseincome', description: 'test transaction 4', date: '2016-02-07', FinanceTransactionComponents: [
          {AccountId: 1, amount: 100}
        ]
      };
      var expectedTransactionData = {
        tags: ['hello','super'], id: 5, type: 'expenseincome', description: 'test transaction 4', date: '2016-02-07', version: 1, FinanceTransactionComponents: [
          {AccountId: 1, amount: 100, id: 6, version: 1}
        ]
      };
      var finalFinanceTransactions = [
        { UserId: 1, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
        ] },
        { UserId: 1, tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1},
        ] },
        { UserId: 2, tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 3, amount: 100, id: 5, version: 1}
        ] },
        { UserId: 1, tags: ['hello','super'], id: 5, type: 'expenseincome', description: 'test transaction 4', date: '2016-02-07', version: 1, FinanceTransactionComponents: [
          {AccountId: 1, amount: 100, id: 6, version: 1}
        ] }
      ];
      var finalAccounts = [
        { UserId: 1, balance: 44.72 + 100, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 1, balance: 160 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 }
      ];
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.post(baseUrl + "/service/transactions").set(tokenHeader(token)).send(updatedTransactionData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedTransactionData);
      var financeTransactions = await dbService.FinanceTransaction.findAll({
        model: dbService.FinanceTransaction,
        include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}],
        order: [
          ['id', 'ASC'],
          [dbService.FinanceTransactionComponent, 'id', 'ASC']
        ]
      });
      financeTransactions = financeTransactions.map(function(financeTransaction){return financeTransaction.toJSON();});
      assert.deepEqual(financeTransactions, finalFinanceTransactions);
      var accounts = await dbService.Account.findAll();
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, finalAccounts);
    });
    it('should be able to delete all transaction components of a transaction for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var updatedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 0, FinanceTransactionComponents: []
      };
      var expectedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 1, FinanceTransactionComponents: []
      };
      var finalFinanceTransactions = [
        { UserId: 1, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 1, FinanceTransactionComponents: [] },
        { UserId: 1, tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1},
        ] },
        { UserId: 2, tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 3, amount: 100, id: 5, version: 1}
        ] }
      ];
      var finalAccounts = [
        { UserId: 1, balance: 2.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 1, balance: -3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 }
      ];
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.post(baseUrl + "/service/transactions").set(tokenHeader(token)).send(updatedTransactionData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedTransactionData);
      financeTransactions = await dbService.FinanceTransaction.findAll({
        model: dbService.FinanceTransaction,
        include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}],
        order: [
          ['id', 'ASC'],
          [dbService.FinanceTransactionComponent, 'id', 'ASC']
        ]
      });
      financeTransactions = financeTransactions.map(function(financeTransaction){return financeTransaction.toJSON();});
      assert.deepEqual(financeTransactions, finalFinanceTransactions);
      var accounts = await dbService.Account.findAll();
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, finalAccounts);
    });
    it('should not be able to change a transaction for an authenticated user with incorrect transaction version numbers', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var updatedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: 42, id: 2, version: 1}, {AccountId: 2, amount: 15}
        ]
      };
      var expectedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 1, FinanceTransactionComponents: [
          {AccountId: 2, amount: 42, id: 2, version: 2}, {AccountId: 2, amount: 15, id: 6, version: 1}
        ]
      };
      var finalFinanceTransactions = [
        { UserId: 1, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 1, FinanceTransactionComponents: [
          {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
        ] },
        { UserId: 1, tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 1, FinanceTransactionComponents: [] },
        { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 1, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1},
        ] },
        { UserId: 2, tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 1, FinanceTransactionComponents: [
          {AccountId: 3, amount: 100, id: 5, version: 1}
        ] }
      ];
      var finalAccounts = [
        { UserId: 1, balance: 44.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 1, balance: 160 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 }
      ];
      await prepopulate();
      await dbService.FinanceTransaction.update({version: 1}, {where: {}});

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/service/transactions").set(tokenHeader(token)).send(updatedTransactionData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.text, 'Data was already updated from another session');
      var financeTransactions = await dbService.FinanceTransaction.findAll({
        model: dbService.FinanceTransaction,
        include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}],
        order: [
          ['id', 'ASC'],
          [dbService.FinanceTransactionComponent, 'id', 'ASC']
        ]
      });
      financeTransactions = financeTransactions.map(function(financeTransaction){return financeTransaction.toJSON();});
      assert.deepEqual(financeTransactions, finalFinanceTransactions);
      var accounts = await dbService.Account.findAll();
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, finalAccounts);
    });
    it('should not be able to change a transaction for an authenticated user with incorrect transaction component version numbers', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var updatedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: 42, id: 2, version: 1}, {AccountId: 2, amount: 15}
        ]
      };
      var expectedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 1, FinanceTransactionComponents: [
          {AccountId: 2, amount: 42, id: 2, version: 2}, {AccountId: 2, amount: 15, id: 6, version: 1}
        ]
      };
      var finalFinanceTransactions = [
        { UserId: 1, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 42, id: 1, version: 2}, {AccountId: 2, amount: 160, id: 2, version: 2}
        ] },
        { UserId: 1, tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 2}, {AccountId: 1, amount: 2.72, id: 4, version: 2},
        ] },
        { UserId: 2, tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 3, amount: 100, id: 5, version: 2}
        ] }
      ];
      var finalAccounts = [
        { UserId: 1, balance: 44.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 1, balance: 160 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 }
      ];
      await prepopulate();
      await dbService.FinanceTransactionComponent.update({version: 2}, {where: {}});

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/service/transactions").set(tokenHeader(token)).send(updatedTransactionData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.text, 'Data was already updated from another session');
      var financeTransactions = await dbService.FinanceTransaction.findAll({
        model: dbService.FinanceTransaction,
        include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}],
        order: [
          ['id', 'ASC'],
          [dbService.FinanceTransactionComponent, 'id', 'ASC']
        ]
      });
      financeTransactions = financeTransactions.map(function(financeTransaction){return financeTransaction.toJSON();});
      assert.deepEqual(financeTransactions, finalFinanceTransactions);
      var accounts = await dbService.Account.findAll();
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, finalAccounts);
    });
    it('should not allow a user to use an AccountId belonging to another user in requests for changing a transaction', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var updatedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 3, amount: 42, id: 2, version: 1}, {AccountId: 3, amount: 15}
        ]
      };
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/service/transactions").set(tokenHeader(token)).send(updatedTransactionData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.equal(result.text, "Cannot set an invalid account id");
      await validateDefaultFinanceTransactionsData();
    });
    it('should not allow a user to use a non-existing AccountId in requests for changing a transaction', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var updatedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 160, amount: 42, id: 2, version: 1}, {AccountId: 3, amount: 15}
        ]
      };
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/service/transactions").set(tokenHeader(token)).send(updatedTransactionData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.equal(result.text, "Cannot set an invalid account id");
      await validateDefaultFinanceTransactionsData();
    });
    it('should ignore UserId in requests for changing a transaction and use OAuth data instead', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var updatedTransactionData = {
         UserId: 2, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: 42, id: 2, version: 1}, {AccountId: 2, amount: 15}
        ]
      };
      var expectedTransactionData = {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 1, FinanceTransactionComponents: [
          {AccountId: 2, amount: 42, id: 2, version: 2}, {AccountId: 2, amount: 15, id: 6, version: 1}
        ]
      };
      var finalFinanceTransactions =[
        { UserId: 1, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 1, FinanceTransactionComponents: [
          {AccountId: 2, amount: 42, id: 2, version: 2}, {AccountId: 2, amount: 15, id: 6, version: 1}
        ] },
        { UserId: 1, tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1},
        ] },
        { UserId: 2, tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 3, amount: 100, id: 5, version: 1}
        ] }
      ];
      var finalAccounts = [
        { UserId: 1, balance: 2.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 1, balance: 42 + 15 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 }
      ];
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.post(baseUrl + "/service/transactions").set(tokenHeader(token)).send(updatedTransactionData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedTransactionData);
      var financeTransactions = await dbService.FinanceTransaction.findAll({
        model: dbService.FinanceTransaction,
        include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}],
        order: [
          ['id', 'ASC'],
          [dbService.FinanceTransactionComponent, 'id', 'ASC']
        ]
      });
      financeTransactions = financeTransactions.map(function(financeTransaction){return financeTransaction.toJSON();});
      assert.deepEqual(financeTransactions, finalFinanceTransactions);
      var accounts = await dbService.Account.findAll();
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, finalAccounts);
    });
    it('should not be able to change a specific requested transaction for an unauthenticated user (no token)', async function () {
      var updatedTransactions = [
        { UserId: 1, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
        ] },
        { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 100500, id: 4, version: 1},
        ] }
      ];
      await prepopulate();

      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/service/transactions").send(updatedTransactions);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
      await validateDefaultFinanceTransactionsData();
    });
    it('should not be able to change a specific requested transaction for an unauthenticated user (bad token)', async function () {
      var updatedTransactions = [
        { UserId: 1, tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1a', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
        ] },
        { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 100500, id: 4, version: 1},
        ] }
      ];
      await prepopulate();

      var token = 'aaaa';
      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/service/transactions").set(tokenHeader(token)).send(updatedTransactions);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
      await validateDefaultFinanceTransactionsData();
    });
  });

  describe('transaction', function () {
    it('should get a specific requested transaction for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/transactions/transaction/1").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
        ]
      });
    });
    it('should delete a specific requested transaction for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var finalFinanceTransactions = [
        { UserId: 1, tags: [], id: 2, type: 'transfer', description: 'test transaction 3', date: '2014-02-17', version: 0, FinanceTransactionComponents: [] },
        { UserId: 1, tags: ['hello','magic'], id: 3, type: 'expenseincome', description: 'test transaction 2', date: '2015-01-07', version: 0, FinanceTransactionComponents: [
          {AccountId: 2, amount: -3.14, id: 3, version: 1}, {AccountId: 1, amount: 2.72, id: 4, version: 1},
        ] },
        { UserId: 2, tags: [], id: 4, type: 'expenseincome', description: 'test transaction 3', date: '2014-05-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 3, amount: 100, id: 5, version: 1}
        ] }
      ];
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.delete(baseUrl + "/service/transactions/transaction/1").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, {
        tags: ['hello','world'], id: 1, type: 'expenseincome', description: 'test transaction 1', date: '2014-02-17', version: 0, FinanceTransactionComponents: [
          {AccountId: 1, amount: 42, id: 1, version: 1}, {AccountId: 2, amount: 160, id: 2, version: 1}
        ]
      });
      var financeTransactions = await dbService.FinanceTransaction.findAll({
        model: dbService.FinanceTransaction,
        include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId']}}],
        order: [
          ['id', 'ASC'],
          [dbService.FinanceTransactionComponent, 'id', 'ASC']
        ]
      });
      financeTransactions = financeTransactions.map(function(financeTransaction){return financeTransaction.toJSON();});
      assert.deepEqual(financeTransactions, finalFinanceTransactions);
    });
    it('should not be able to get a specific non-existing requested transaction for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
          await superagent.get(baseUrl + "/service/transactions/transaction/160").set(tokenHeader(token));
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.equal(result.text, "Transaction does not exist");
    });
    it('should not be able to delete a specific non-existing requested transaction for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
        await superagent.delete(baseUrl + "/service/transactions/transaction/160").set(tokenHeader(token));
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.equal(result.text, "Cannot delete non-existing transaction");
      await validateDefaultFinanceTransactionsData();
    });
    it('should not allow an authenticated user to get a specific requested transaction beloging to another user', async function () {
      var userData = {username: "user02", password: "mypassword2"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
        await superagent.get(baseUrl + "/service/transactions/transaction/1").set(tokenHeader(token));
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.equal(result.text, "Transaction does not exist");
    });
    it('should not allow an authenticated user to delete a specific requested transaction beloging to another user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
        await superagent.delete(baseUrl + "/service/transactions/transaction/4").set(tokenHeader(token));
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.equal(result.text, "Cannot delete non-existing transaction");
      await validateDefaultFinanceTransactionsData();
    });
    it('should not be able to get a specific requested transaction for an unauthenticated user (no token)', async function () {
      await prepopulate();

      var error;
      try {
        await superagent.get(baseUrl + "/service/transactions/transaction/1");
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to get a specific requested transaction for an unauthenticated user (bad token)', async function () {
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.get(baseUrl + "/service/transactions/transaction/1").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to delete a specific requested transaction for an unauthenticated user (no token)', async function () {
      await prepopulate();

      var error;
      try {
        await superagent.delete(baseUrl + "/service/transactions/transaction/1");
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
      await validateDefaultFinanceTransactionsData();
    });
    it('should not be able to delete a specific requested transaction for an unauthenticated user (bad token)', async function () {
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.delete(baseUrl + "/service/transactions/transaction/1").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
      await validateDefaultFinanceTransactionsData();
    });
  });
});
