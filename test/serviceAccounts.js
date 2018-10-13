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

  var validateDefaultAccountData = async function(){
    var defaultAccounts = [
      { UserId: 1, balance: 42 + 2.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
      { UserId: 1, balance: 160 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
      { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 }
    ];
    var accounts = await dbService.Account.findAll();
    accounts = accounts.map(function(account){return account.toJSON();});
    assert.deepEqual(accounts, defaultAccounts);
  };

  describe('accounts', function () {
    it('should get a list of accounts for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.get(baseUrl + "/service/accounts").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, [
        { balance: 42 + 2.72, id: 1, name: 'test account 1', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 },
        { balance: 160 - 3.14, id: 2, name: 'test account 2', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 }
      ]);
    });
    it('should be able to change the accounts for an authenticated user', async function () {
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
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/accounts").set(tokenHeader(token)).send(newAccountData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedAccountData);
      var accounts = await dbService.Account.findAll();
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, finalAccounts);
    });
    it('should be able to delete all accounts for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var finalAccounts = [
        { UserId: 2, balance: 100, id: 3, name: 'test account 3', currency: 'RUB', includeInTotal: true, showInList: true, version: 0 }
      ];
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/accounts").set(tokenHeader(token)).send([]);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, []);
      var accounts = await dbService.Account.findAll();
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, finalAccounts);
    });
    it('should not be able to change the accounts for an authenticated user with incorrect version numbers', async function () {
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
      await prepopulate();
      await dbService.Account.update({version: 1}, {where: {}});
      var {token, result} = await authenticateUser(userData);

      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/service/accounts").set(tokenHeader(token)).send(newAccountData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.text, 'Data was already updated from another session');
      var accounts = await dbService.Account.findAll();
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, finalAccounts)
    });
    it('should ignore UserId in requests for changing accounts and use OAuth data instead', async function () {
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
      await prepopulate();
      var {token, result} = await authenticateUser(userData);

      var result = await superagent.post(baseUrl + "/service/accounts").set(tokenHeader(token)).send(newAccountData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, expectedAccountData);
      var accounts = await dbService.Account.findAll();
      accounts = accounts.map(function(account){return account.toJSON();});
      assert.deepEqual(accounts, finalAccounts)
    });
    it('should not be able to get a list of accounts for an unauthenticated user (no token)' , async function () {
      await prepopulate();

      var error;
      try {
        await superagent.get(baseUrl + "/service/accounts");
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to get a list of accounts for an unauthenticated user (bad token)', async function () {
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.get(baseUrl + "/service/accounts").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to change accounts for an unauthenticated user (no token)', async function () {
      var newAccountData = [
        { UserId: 2, balance: 111, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 0 },
        { UserId: 2, balance: 222, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 333, name: 'test account 4', currency: 'USD', includeInTotal: true, showInList: true, version: 0 }
      ];
      await prepopulate();

      var error;
      try {
        await superagent.post(baseUrl + "/service/accounts").send(newAccountData);
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
      await validateDefaultAccountData();
    });
    it('should not be able to change accounts for an unauthenticated user (bad token)', async function () {
      var newAccountData = [
        { UserId: 2, balance: 111, id: 1, name: 'test account 1a', currency: 'RUB', includeInTotal: false, showInList: false, version: 0 },
        { UserId: 2, balance: 222, name: 'test account 3', currency: 'EUR', includeInTotal: true, showInList: true, version: 0 },
        { UserId: 2, balance: 333, name: 'test account 4', currency: 'USD', includeInTotal: true, showInList: true, version: 0 }
      ];
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.post(baseUrl + "/service/accounts").set(tokenHeader(token)).send(newAccountData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
      await validateDefaultAccountData();
    });
  });
});
