var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/dbservice');
var prepopulate = require('./utils/prepopulate').prepopulate;
var superagent = require('superagent');
var fs = require('fs');
var path = require('path');
var util = require('util');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

var readFile = util.promisify(fs.readFile);

describe('Service', function() {
  serviceBase.hooks();

  describe('export', function () {
    it('should export data for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var expectedExportData = {
        accounts: [
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
        transactions: [
          {
            description: "test transaction 1",
            type: "EXPENSEINCOME",
            date: "2014-02-17",
            tags: ["hello", "world"],
            components: [
              {amount: 42, accountId: 1}, {amount: 160, accountId: 2}
            ]
          }, {
            description: "test transaction 3",
            type: "TRANSFER",
            date: "2014-02-17",
            tags: [],
            components: []
          }, {
            description: "test transaction 2",
            type: "EXPENSEINCOME",
            date: "2015-01-07",
            tags: ["hello","magic"],
            components: [
              {amount: -3.14, accountId: 2}, {amount: 2.72, accountId: 1}
            ]
          }
        ]
      };
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.post(baseUrl + "/service/export").send("access_token=" + token);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedExportData);
    });
    it('should export data for an authenticated user with an empty account', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var expectedExportData = {
        accounts: [],
        transactions: []
      };
      await dbService.User.create({
        username: "user01",
        password: "mypassword"
      });

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.post(baseUrl + "/service/export").send("access_token=" + token);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedExportData);
    });
    it('should not be able to export data for an unauthenticated user (no token)', async function () {
      await prepopulate();

      var error;
      try {
        await superagent.post(baseUrl + "/service/export");
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to export data for an unauthenticated user (bad token)', async function () {
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.post(baseUrl + "/service/export").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to export data for an unauthenticated user (bad access_token)', async function () {
      await prepopulate();
      var error;
      try {
        await superagent.post(baseUrl + "/service/export").send('access_token=aaaa');
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
  });

  describe('import', function () {
    it('should import data for an authenticated user with an empty account', async function () {
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
      var pathToFile = path.join(__dirname, 'data', 'vogon-export.json');
      await prepopulate();

      await dbService.User.create({
        username: "user03",
        password: "mypassword3"
      });

      var importData = await readFile(pathToFile);
      var user3 = JSON.parse(importData);
      user3.username = "user03";
      user3.id = 3;
      user3.version = 0;
      user3.Accounts = user3.accounts;
      delete user3.accounts;
      user3.Accounts.sort(function(a,b){return a.id - b.id;});
      user3.Accounts.forEach(function(account){
        account.version = 1;
        delete account.id;
      });
      user3.FinanceTransactions = user3.transactions;
      delete user3.transactions;
      user3.FinanceTransactions.sort(function(a,b){return a.id - b.id;});
      var transactionIdRemappings = {6: 1, 8: 2, 12: 3, 14: 4, 17: 5};
      var transactionComponentIdRemappings = {7: 1, 9: 2, 10: 3, 11: 4, 13: 5, 15: 6, 16: 7, 18: 8, 19: 9};
      user3.FinanceTransactions.forEach(function(financeTransaction){
        financeTransaction.version = 1;
        financeTransaction.id = transactionIdRemappings[financeTransaction.id] + 4;
        financeTransaction.type = financeTransaction.type.toLowerCase();
        financeTransaction.tags.sort();
        delete financeTransaction.amount;
        financeTransaction.FinanceTransactionComponents = financeTransaction.components;
        delete financeTransaction.components;
        financeTransaction.FinanceTransactionComponents.sort(function(a,b){return a.id - b.id;});
        financeTransaction.FinanceTransactionComponents.forEach(function(financeTransactionComponent){
          financeTransactionComponent.version = 1;
          financeTransactionComponent.AccountId = financeTransactionComponent.accountId + 2;
          delete financeTransactionComponent.accountId;
          financeTransactionComponent.id = transactionComponentIdRemappings[financeTransactionComponent.id] + 5;
        });
      });
      expectedUsers.push(user3);

      var {token, result} = await authenticateUser(userData);
      result = await superagent.post(baseUrl + "/service/import").set(tokenHeader(token)).attach('file', pathToFile);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, true);

      var users = await dbService.User.findAll({
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
      });
      usersJson = users.map(function(user){return user.toJSON();});
      usersJson.forEach(function(user){ delete user.password; });
      assert.deepEqual(usersJson, expectedUsers);
      var passwordValid = await users[0].validatePassword('mypassword');
      assert.equal(passwordValid, true);
      passwordValid = await users[1].validatePassword('mypassword2');
      assert.equal(passwordValid, true);
      passwordValid = await users[2].validatePassword('mypassword3');
      assert.equal(passwordValid, true);
    });
    it('should not be able to import data for an unauthenticated user (no token)', async function () {
      await prepopulate();

      var error;
      try {
        await superagent.post(baseUrl + "/service/import");
      } catch (err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to import data for an unauthenticated user (bad token)', async function () {
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.post(baseUrl + "/service/import").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
  });
});
