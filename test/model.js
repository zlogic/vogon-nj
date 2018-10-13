var assert = require('assert');
var dbService = require('../services/dbservice');
var fs = require('fs');
var path = require('path');
var util = require('util');
var logger = require('../services/logger').logger;
var dbConfiguration = require('./utils/dbconfiguration.js');
require('./utils/logging');

var currentDate = function(){
  var currentTime = new Date();
  return new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()).toJSON().split("T")[0];
};

var readFile = util.promisify(fs.readFile);

describe('Model', function() {
  beforeEach(function() {
    logger.info(this.currentTest.fullTitle());
    dbConfiguration.reconfigureDb();
    return dbService.sequelize.sync({force: true});
  });

  describe('operations', function () {
    it('should be able to create related entities in sequence', async function () {
      var user1 = dbService.User.build({
        username: " User01 ",
        password: "mypassword"
      });
      var account1 = dbService.Account.build({
        name: "test account 1",
        balance: 5,
        currency: "RUB",
        includeInTotal: true,
        showInList: true
      });
      var transaction1 = dbService.FinanceTransaction.build({
        description: "test transaction 1",
        type: "expenseincome",
        date: currentDate(),
        tags: ["hello", "world"],
        amount: 3
      });
      var transactionComponent1 = dbService.FinanceTransactionComponent.build({
        amount: 100
      });
      await dbService.sequelize.transaction(async function(transaction){
        await user1.save({transaction: transaction})
        await account1.save({transaction: transaction});
        await user1.addAccount(account1, {transaction: transaction});
        await transaction1.save({transaction: transaction});
        await user1.addFinanceTransaction(transaction1, {transaction: transaction});
        await transactionComponent1.save({transaction: transaction});
        await transactionComponent1.setFinanceTransaction(transaction1, {transaction: transaction});
        await transactionComponent1.setAccount(account1, {transaction: transaction});
      });
      var users = await dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
        //include: [{ all: true }]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.username, "user01");
      assert.equal(user.Accounts.length, 1);
      var account = user.Accounts[0];
      assert.equal(account.name, "test account 1");
      assert.equal(account.balance, 100);
      assert.equal(account.currency, "RUB");
      assert.equal(account.includeInTotal, true);
      assert.equal(account.showInList, true);
      assert.equal(user.FinanceTransactions.length, 1);
      var transaction = user.FinanceTransactions[0];
      assert.equal(transaction.description,  "test transaction 1");
      assert.equal(transaction.type, "expenseincome");
      assert.equal(transaction.date, currentDate());
      assert.deepEqual(transaction.tags, ["hello", "world"]);
      assert.equal(transaction.FinanceTransactionComponents.length, 1);
      var component = transaction.FinanceTransactionComponents[0];
      assert.equal(component.amount, 100);
      assert.equal(component.AccountId, account.id);
      assert.equal(component.FinanceTransactionId, transaction.id);
      var validPassword = await user.validatePassword("mypassword");
      assert.equal(validPassword, true);
    });
    it('should be able to create related entities all at once', async function () {
      await dbService.sequelize.transaction(async function(transaction){
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              tags: ["hello", "world"],
              amount: 3
            }
          ]
        }, {include: [dbService.Account, dbService.FinanceTransaction], transaction: transaction});
        user = createdUser;
        var transactionComponent = await dbService.FinanceTransactionComponent.create({
          amount: 100
        }, {transaction: transaction});
        var transactionComponent = await transactionComponent.setFinanceTransaction(user.FinanceTransactions[0], {transaction: transaction});
        await transactionComponent.setAccount(user.Accounts[0], {transaction: transaction});
      });
      var users = await dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.username, "user01");
      assert.equal(user.Accounts.length, 1);
      var account = user.Accounts[0];
      assert.equal(account.name, "test account 1");
      assert.equal(account.balance, 100);
      assert.equal(account.currency, "RUB");
      assert.equal(account.includeInTotal, true);
      assert.equal(account.showInList, true);
      assert.equal(user.FinanceTransactions.length, 1);
      var transaction = user.FinanceTransactions[0];
      assert.equal(transaction.description,  "test transaction 1");
      assert.equal(transaction.type, "expenseincome");
      assert.equal(transaction.date, currentDate());
      assert.deepEqual(transaction.tags, ["hello", "world"]);
      assert.equal(transaction.FinanceTransactionComponents.length, 1);
      var component = transaction.FinanceTransactionComponents[0];
      assert.equal(component.amount, 100);
      assert.equal(component.AccountId, account.id);
      assert.equal(component.FinanceTransactionId, transaction.id);
      var validPassword = await user.validatePassword("mypassword");
      assert.equal(validPassword, true);
    });
    it('should correctly handle adding a transaction', async function () {
      await dbService.sequelize.transaction(async function(transaction){
        var user = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            },
            {
              name: "test account 2",
              balance: 15,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
        }, {include: [dbService.Account], transaction: transaction});
        account1 = user.Accounts[0];
        var createdTransaction = await dbService.FinanceTransaction.create({
          description: "test transaction 1",
          type: "expenseincome",
          date: currentDate(),
            FinanceTransactionComponents: [ { amount: 42 } ]
        }, {include: [dbService.FinanceTransactionComponent], transaction: transaction});
        await createdTransaction.setUser(user, {transaction: transaction});
        await createdTransaction.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction});
      });
      var users = await dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.Accounts.length, 2);
      var account1 = user.Accounts[0];
      assert.equal(account1.name, "test account 1");
      assert.equal(account1.balance, 42);
      var account2 = user.Accounts[1];
      assert.equal(account2.name, "test account 2");
      assert.equal(account2.balance, 0);
      assert.equal(user.FinanceTransactions.length, 1);
      var transaction = user.FinanceTransactions[0];
      assert.equal(transaction.description,  "test transaction 1");
      assert.equal(transaction.type, "expenseincome");
      assert.equal(transaction.date, currentDate());
      assert.equal(transaction.FinanceTransactionComponents.length, 1);
      var component = transaction.FinanceTransactionComponents[0];
      assert.equal(component.amount, 42);
      assert.equal(component.AccountId, account1.id);
      assert.equal(component.FinanceTransactionId, transaction.id);
    });
    it('should correctly handle changing a transaction amount', async function () {
      await dbService.sequelize.transaction(async function(transaction){
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            },
            {
              name: "test account 2",
              balance: 15,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              FinanceTransactionComponents: [ { amount: 42 } ]
            }
          ],
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction})
        var account1 = createdUser.Accounts[0];
        var transaction1 = createdUser.FinanceTransactions[0];
        transactionComponent1 = transaction1.FinanceTransactionComponents[0];
        await transactionComponent1.setAccount(account1, {transaction: transaction})
        await transaction1.setUser(createdUser, {transaction: transaction});
        transactionComponent1.amount = 50;
        await transactionComponent1.save({transaction: transaction});
      })
      var users = await  dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.Accounts.length, 2);
      var account1 = user.Accounts[0];
      assert.equal(account1.name, "test account 1");
      assert.equal(account1.balance, 50);
      var account2 = user.Accounts[1];
      assert.equal(account2.name, "test account 2");
      assert.equal(account2.balance, 0);
      assert.equal(user.FinanceTransactions.length, 1);
      var transaction = user.FinanceTransactions[0];
      assert.equal(transaction.description,  "test transaction 1");
      assert.equal(transaction.FinanceTransactionComponents.length, 1);
      var component = transaction.FinanceTransactionComponents[0];
      assert.equal(component.AccountId, account1.id);
      assert.equal(component.FinanceTransactionId, transaction.id);
    });
    it('should correctly handle changing a transaction component account', async function () {
      await dbService.sequelize.transaction(async function(transaction){
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            },
            {
              name: "test account 2",
              balance: 15,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              FinanceTransactionComponents: [ { amount: 42 }, { amount: 160 } ]
            }
          ],
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction});
        var account1 = createdUser.Accounts[0];
        account2 = createdUser.Accounts[1];
        var transaction1 = createdUser.FinanceTransactions[0];
        var transactionComponent1 = transaction1.FinanceTransactionComponents[0];
        transactionComponent2 = transaction1.FinanceTransactionComponents[1];
        await transactionComponent1.setAccount(account1, {transaction: transaction});
        await transactionComponent2.setAccount(account1, {transaction: transaction});
        await transaction1.setUser(createdUser, {transaction: transaction});
      })
      var users = await dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.Accounts.length, 2);
      var account1 = user.Accounts[0];
      assert.equal(account1.balance, 42+160);
      var account2 = user.Accounts[1];
      assert.equal(account2.balance, 0);
      assert.equal(user.FinanceTransactions.length, 1);
      var transaction = user.FinanceTransactions[0];
      assert.equal(transaction.FinanceTransactionComponents.length, 2);
      var component1 = transaction.FinanceTransactionComponents[0];
      var component2 = transaction.FinanceTransactionComponents[1];
      assert.equal(component1.amount, 42);
      assert.equal(component1.AccountId, account1.id);
      assert.equal(component1.FinanceTransactionId, transaction.id);
      assert.equal(component2.amount, 160);
      assert.equal(component2.AccountId, account1.id);
      assert.equal(component2.FinanceTransactionId, transaction.id);

      await dbService.sequelize.transaction(function(transaction){
        return transactionComponent2.setAccount(account2, {transaction: transaction});
      });
      users = await dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.Accounts.length, 2);
      var account1 = user.Accounts[0];
      assert.equal(account1.name, "test account 1");
      assert.equal(account1.balance, 42);
      var account2 = user.Accounts[1];
      assert.equal(account2.name, "test account 2");
      assert.equal(account2.balance, 160);
      assert.equal(user.FinanceTransactions.length, 1);
      var transaction = user.FinanceTransactions[0];
      assert.equal(transaction.FinanceTransactionComponents.length, 2);
      var component1 = transaction.FinanceTransactionComponents[0];
      var component2 = transaction.FinanceTransactionComponents[1];
      assert.equal(component1.amount, 42);
      assert.equal(component1.AccountId, account1.id);
      assert.equal(component1.FinanceTransactionId, transaction.id);
      assert.equal(component2.amount, 160);
      assert.equal(component2.AccountId, account2.id);
      assert.equal(component2.FinanceTransactionId, transaction.id);
    });
    it('should correctly handle adding a transaction component to an existing transaction', async function () {
      await dbService.sequelize.transaction(async function(transaction){
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            },
            {
              name: "test account 2",
              balance: 15,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              FinanceTransactionComponents: [ { amount: 42 } ]
            }
          ],
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction})
        account1 = createdUser.Accounts[0];
        transaction1 = createdUser.FinanceTransactions[0];
        var transactionComponent1 = transaction1.FinanceTransactionComponents[0];
        await transactionComponent1.setAccount(account1, {transaction: transaction});
        await transaction1.setUser(createdUser, {transaction: transaction});
        var transactionComponent = await dbService.FinanceTransactionComponent.create({
          amount: 160
        }, {transaction: transaction});
        await transactionComponent.setAccount(account1, {transaction: transaction});
        await transactionComponent.setFinanceTransaction(transaction1, {transaction: transaction});
      });
      var users = await dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.Accounts.length, 2);
      var account1 = user.Accounts[0];
      assert.equal(account1.name, "test account 1");
      assert.equal(account1.balance, 42+160);
      var account2 = user.Accounts[1];
      assert.equal(account2.name, "test account 2");
      assert.equal(account2.balance, 0);
      assert.equal(user.FinanceTransactions.length, 1);
      var transaction = user.FinanceTransactions[0];
      assert.equal(transaction.FinanceTransactionComponents.length, 2);
      var component1 = transaction.FinanceTransactionComponents[0];
      var component2 = transaction.FinanceTransactionComponents[1];
      assert.equal(component1.amount, 42);
      assert.equal(component1.AccountId, account1.id);
      assert.equal(component1.FinanceTransactionId, transaction.id);
      assert.equal(component2.amount, 160);
      assert.equal(component2.AccountId, account1.id);
      assert.equal(component2.FinanceTransactionId, transaction.id);
    });
    it('should correctly handle deleting a transaction component from an existing transaction', async function () {
      await dbService.sequelize.transaction(async function(transaction){
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            },
            {
              name: "test account 2",
              balance: 15,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              FinanceTransactionComponents: [ { amount: 42 }, { amount: 160 } ]
            }
          ],
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction});
        var account1 = createdUser.Accounts[0];
        var transaction1 = createdUser.FinanceTransactions[0];
        var transactionComponent1 = transaction1.FinanceTransactionComponents[0];
        transactionComponent2 = transaction1.FinanceTransactionComponents[1];
        await transactionComponent1.setAccount(account1, {transaction: transaction});
        await transactionComponent2.setAccount(account1, {transaction: transaction});
        await transaction1.setUser(createdUser, {transaction: transaction});
        await transactionComponent2.destroy({transaction: transaction});
      });
      var users = await dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.Accounts.length, 2);
      var account1 = user.Accounts[0];
      assert.equal(account1.name, "test account 1");
      assert.equal(account1.balance, 42);
      var account2 = user.Accounts[1];
      assert.equal(account2.name, "test account 2");
      assert.equal(account2.balance, 0);
      assert.equal(user.FinanceTransactions.length, 1);
      var transaction = user.FinanceTransactions[0];
      assert.equal(transaction.FinanceTransactionComponents.length, 1);
      var component1 = transaction.FinanceTransactionComponents[0];
      assert.equal(component1.amount, 42);
      assert.equal(component1.AccountId, account1.id);
      assert.equal(component1.FinanceTransactionId, transaction.id);
    });
    it('should correctly handle deleting a transaction', async function () {
      await dbService.sequelize.transaction(async function(transaction){
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            },
            {
              name: "test account 2",
              balance: 15,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              FinanceTransactionComponents: [ { amount: 42 }, { amount: 160 } ]
            }, {
              description: "test transaction 2",
              type: "expenseincome",
              date: currentDate(),
              FinanceTransactionComponents: [ { amount: 7 }, { amount: 13 } ]
            }
          ],
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction});
        var account1 = createdUser.Accounts[0];
        var account2 = createdUser.Accounts[1];
        var transaction1 = createdUser.FinanceTransactions[0];
        transaction2 = createdUser.FinanceTransactions[1];
        await transaction1.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction});
        await transaction1.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
        await transaction2.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction});
        await transaction2.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
        await transaction1.setUser(createdUser, {transaction: transaction});
        await transaction2.setUser(createdUser, {transaction: transaction});
        await transaction2.destroy({transaction: transaction});
      });
      var users = await dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.Accounts.length, 2);
      var account1 = user.Accounts[0];
      assert.equal(account1.name, "test account 1");
      assert.equal(account1.balance, 42);
      var account2 = user.Accounts[1];
      assert.equal(account2.name, "test account 2");
      assert.equal(account2.balance, 160);
      assert.equal(user.FinanceTransactions.length, 1);
      var transaction = user.FinanceTransactions[0];
      assert.equal(transaction.FinanceTransactionComponents.length, 2);
      var component1 = transaction.FinanceTransactionComponents[0];
      assert.equal(component1.amount, 42);
      assert.equal(component1.AccountId, account1.id);
      assert.equal(component1.FinanceTransactionId, transaction.id);
      var component2 = transaction.FinanceTransactionComponents[1];
      assert.equal(component2.amount, 160);
      assert.equal(component2.AccountId, account2.id);
      assert.equal(component2.FinanceTransactionId, transaction.id);
    });
    it('should correctly handle deleting an account', async function () {
      await dbService.sequelize.transaction(async function(transaction){
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            },
            {
              name: "test account 2",
              balance: 15,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              FinanceTransactionComponents: [ { amount: 42 }, { amount: 160 } ]
            }, {
              description: "test transaction 2",
              type: "expenseincome",
              date: currentDate(),
              FinanceTransactionComponents: [ { amount: 7 }, { amount: 13 } ]
            }
          ],
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction});
        var account1 = createdUser.Accounts[0];
        account2 = createdUser.Accounts[1];
        var transaction1 = createdUser.FinanceTransactions[0];
        var transaction2 = createdUser.FinanceTransactions[1];
        await transaction1.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction});
        await transaction1.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
        await transaction2.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction});
        await transaction2.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
        await transaction1.setUser(createdUser, {transaction: transaction});
        await transaction2.setUser(createdUser, {transaction: transaction});
        await account2.destroy({transaction: transaction});
      });
      var users = await dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.Accounts.length, 1);
      var account1 = user.Accounts[0];
      assert.equal(account1.name, "test account 1");
      assert.equal(account1.balance, 42+7);
      assert.equal(user.FinanceTransactions.length, 2);
      var transaction1 = user.FinanceTransactions[0];
      assert.equal(transaction1.FinanceTransactionComponents.length, 1);
      var component1 = transaction1.FinanceTransactionComponents[0];
      assert.equal(component1.amount, 42);
      assert.equal(component1.AccountId, account1.id);
      assert.equal(component1.FinanceTransactionId, transaction1.id);
      var transaction2 = user.FinanceTransactions[1];
      assert.equal(transaction2.FinanceTransactionComponents.length, 1);
      var component2 = transaction2.FinanceTransactionComponents[0];
      assert.equal(component2.amount, 7);
      assert.equal(component2.AccountId, account1.id);
      assert.equal(component2.FinanceTransactionId, transaction2.id);
    });
    it('should correctly import data from the java version of vogon', async function () {
      var user = await dbService.User.create({
        username: "user01",
        password: "mypassword"
      });
      var data = await readFile(path.join(__dirname, 'data', 'vogon-export.json'));
      data = JSON.parse(data);
      await dbService.sequelize.transaction(function (transaction) {
        return dbService.importData(user, data, {transaction: transaction});
      });
      var users = await dbService.User.findAll({
        include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}],
        order: [
          [dbService.Account, "id", "ASC"],
          [dbService.FinanceTransaction, "id", "ASC"],
          [dbService.FinanceTransaction, dbService.FinanceTransactionComponent, "id", "ASC"]
        ]
      });
      assert.equal(users.length, 1);
      var user = users[0];
      assert.equal(user.Accounts.length, 4);
      assert.equal(user.Accounts[0].name, "Orange Bank");
      assert.equal(user.Accounts[0].balance, 990.0);
      assert.equal(user.Accounts[0].currency, "PLN");
      assert.equal(user.Accounts[0].includeInTotal, true);
      assert.equal(user.Accounts[0].showInList, true);
      assert.equal(user.Accounts[1].name, "Green Bank");
      assert.equal(user.Accounts[1].balance, 900.0);
      assert.equal(user.Accounts[1].currency, "ALL");
      assert.equal(user.Accounts[1].includeInTotal, true);
      assert.equal(user.Accounts[1].showInList, false);
      assert.equal(user.Accounts[2].name, "Purple Bank");
      assert.equal(user.Accounts[2].balance, 800.0);
      assert.equal(user.Accounts[2].currency, "ZWL");
      assert.equal(user.Accounts[2].includeInTotal, false);
      assert.equal(user.Accounts[2].showInList, true);
      assert.equal(user.Accounts[3].name, "Magical Credit Card");
      assert.equal(user.Accounts[3].balance, -80.0);
      assert.equal(user.Accounts[3].currency, "PLN");
      assert.equal(user.Accounts[3].includeInTotal, false);
      assert.equal(user.Accounts[3].showInList, false);

      assert.equal(user.FinanceTransactions.length, 5);

      assert.equal(user.FinanceTransactions[0].type, "expenseincome");
      assert.equal(user.FinanceTransactions[0].description, "Widgets");
      assert.deepEqual(user.FinanceTransactions[0].tags, ["Widgets"]);
      assert.equal(user.FinanceTransactions[0].date, "2015-11-02");
      assert.equal(user.FinanceTransactions[0].FinanceTransactionComponents.length, 1);
      assert.equal(user.FinanceTransactions[0].FinanceTransactionComponents[0].amount, -100.0);
      assert.equal(user.FinanceTransactions[0].FinanceTransactionComponents[0].AccountId, user.Accounts[1].id);

      assert.equal(user.FinanceTransactions[1].type, "expenseincome");
      assert.equal(user.FinanceTransactions[1].description, "Salary");
      assert.deepEqual(user.FinanceTransactions[1].tags, ["Salary"]);
      assert.equal(user.FinanceTransactions[1].date, "2015-11-01");
      assert.equal(user.FinanceTransactions[1].FinanceTransactionComponents.length, 3);
      assert.equal(user.FinanceTransactions[1].FinanceTransactionComponents[0].amount, 1000.0);
      assert.equal(user.FinanceTransactions[1].FinanceTransactionComponents[0].AccountId, user.Accounts[0].id);
      assert.equal(user.FinanceTransactions[1].FinanceTransactionComponents[1].amount, 1000.0);
      assert.equal(user.FinanceTransactions[1].FinanceTransactionComponents[1].AccountId, user.Accounts[1].id);
      assert.equal(user.FinanceTransactions[1].FinanceTransactionComponents[2].amount, 1000.0);
      assert.equal(user.FinanceTransactions[1].FinanceTransactionComponents[2].AccountId, user.Accounts[2].id);

      assert.equal(user.FinanceTransactions[2].type, "expenseincome");
      assert.equal(user.FinanceTransactions[2].description, "Gadgets");
      assert.deepEqual(user.FinanceTransactions[2].tags, ["Gadgets"]);
      assert.equal(user.FinanceTransactions[2].date, "2015-11-03");
      assert.equal(user.FinanceTransactions[2].FinanceTransactionComponents.length, 1);
      assert.equal(user.FinanceTransactions[2].FinanceTransactionComponents[0].amount, -100.0);
      assert.equal(user.FinanceTransactions[2].FinanceTransactionComponents[0].AccountId, user.Accounts[3].id);

      assert.equal(user.FinanceTransactions[3].type, "transfer");
      assert.equal(user.FinanceTransactions[3].description, "Credit card payment");
      assert.deepEqual(user.FinanceTransactions[3].tags, ["Credit"]);
      assert.equal(user.FinanceTransactions[3].date, "2015-11-09");
      assert.equal(user.FinanceTransactions[3].FinanceTransactionComponents.length, 2);
      assert.equal(user.FinanceTransactions[3].FinanceTransactionComponents[0].amount, -100.0);
      assert.equal(user.FinanceTransactions[3].FinanceTransactionComponents[0].AccountId, user.Accounts[2].id);
      assert.equal(user.FinanceTransactions[3].FinanceTransactionComponents[1].amount, 20.0);
      assert.equal(user.FinanceTransactions[3].FinanceTransactionComponents[1].AccountId, user.Accounts[3].id);

      assert.equal(user.FinanceTransactions[4].type, "expenseincome");
      assert.equal(user.FinanceTransactions[4].description, "Stuff");
      assert.deepEqual(user.FinanceTransactions[4].tags, ["Gadgets","Widgets"]);
      assert.equal(user.FinanceTransactions[4].date, "2015-11-07");
      assert.equal(user.FinanceTransactions[4].FinanceTransactionComponents.length, 2);
      assert.equal(user.FinanceTransactions[4].FinanceTransactionComponents[0].amount, -10.0);
      assert.equal(user.FinanceTransactions[4].FinanceTransactionComponents[0].AccountId, user.Accounts[0].id);
      assert.equal(user.FinanceTransactions[4].FinanceTransactionComponents[1].amount, -100.0);
      assert.equal(user.FinanceTransactions[4].FinanceTransactionComponents[1].AccountId, user.Accounts[2].id);
    });
    it('should correctly export data', async function () {
      var user = await dbService.sequelize.transaction(async function (transaction) {
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              id: 1,
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            },
            {
              id:3,
              name: "test account 2",
              balance: 15,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              tags: ["magic", "awesome"],
              FinanceTransactionComponents: [ { amount: 42 }, { amount: 160 } ]
            }, {
              description: "test transaction 2",
              type: "expenseincome",
              date: currentDate(),
              tags: ["magic"],
              FinanceTransactionComponents: [ { amount: 7 }, { amount: 13 } ]
            }
          ],
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction});
        var account1 = createdUser.Accounts[0];
        var account2 = createdUser.Accounts[1];
        var transaction1 = createdUser.FinanceTransactions[0];
        var transaction2 = createdUser.FinanceTransactions[1];
        assert.deepEqual(account1.id, 1);
        assert.deepEqual(account2.id, 3);
        await transaction1.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction});
        await transaction1.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
        await transaction2.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction});
        await transaction2.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
        await transaction1.setUser(createdUser, {transaction: transaction});
        await transaction2.setUser(createdUser, {transaction: transaction});
        return createdUser;
      });
      var exportData = await dbService.exportData(user);
      assert.deepEqual(exportData, {
        accounts:[
          {id:1, name:"test account 1", balance:49, currency:"RUB", includeInTotal:true, showInList:true},
          {id:2, name:"test account 2", balance:173, currency:"RUB", includeInTotal:true, showInList:true}
        ],
        transactions:[
          {type:"EXPENSEINCOME", description:"test transaction 1", date:currentDate(), tags:["awesome","magic"], components:[{amount:42, accountId:1}, {amount:160, accountId:2}]},
          {type:"EXPENSEINCOME", description:"test transaction 2", date:currentDate(), tags:["magic"], components:[{amount:7, accountId:1}, {amount:13, accountId:2}]}
        ]
      });
    });
    it('should not allow creating two users with the same username in bulk', async function () {
      var error;
      try {
        await dbService.sequelize.transaction(async function(transaction){
          var users = await dbService.User.bulkCreate([{
            username: "user01",
            password: "mypassword"
          }, {
            username: "user01",
            password: "mypassword"
          }], {transaction: transaction})
        });
      } catch(err) {
        error = err;
      }
      if(error === undefined)
        throw new Error("Unique username constraint is not enforced");
      assert.equal(error.name, 'SequelizeUniqueConstraintError');
    });
    it('should not allow creating two users with the same username separately', async function () {
      var error;
      try {
        await dbService.sequelize.transaction(function(transaction){
          return dbService.User.create({
            username: "user01",
            password: "mypassword"
          }, {transaction: transaction});
        });
        await dbService.sequelize.transaction(async function(transaction){
          return dbService.User.create({
            username: "user01",
            password: "mypassword"
          }, {transaction: transaction});
        });
      } catch(err) {
        error = err;
      }
      if(error === undefined)
        throw new Error("Unique username constraint is not enforced");
      assert.equal(error.name, 'SequelizeUniqueConstraintError');;
    });
    it('should not allow conflicting updates from separate transactions', async function () {
      this.timeout(4000);
      await dbService.sequelize.sync({force: true});
      var user = await dbService.sequelize.transaction(async function(transaction){
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              id: 1,
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              tags: ["magic", "awesome"],
              FinanceTransactionComponents: [ { amount: 42 }, { amount: 160 } ]
            }
          ]
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction});
        var account = createdUser.Accounts[0];
        var financeTransaction = createdUser.FinanceTransactions[0];
        await financeTransaction.FinanceTransactionComponents[0].setAccount(account, {transaction: transaction});
        await financeTransaction.FinanceTransactionComponents[1].setAccount(account, {transaction: transaction});
        await financeTransaction.setUser(createdUser, {transaction: transaction});
        return createdUser;
      });
      var error;
      try {
        await dbService.sequelize.transaction(async function(transaction1){
          await user.FinanceTransactions[0].FinanceTransactionComponents[0].update({amount: 314}, {transaction: transaction1});
          await dbService.sequelize.transaction(function(transaction2){
            return user.FinanceTransactions[0].FinanceTransactionComponents[1].update({amount: 314}, {transaction: transaction2})
          });
        });
      } catch (err) {
        error = err;
      }
      if(error === undefined)
        throw new Error("Transaction constraint was not enforced, conflicting updates applied");
      assert.equal(error.name, 'SequelizeDatabaseError');
    });
    it('should properly delete orphaned entities during maintenance', async function () {
      var user = await dbService.sequelize.transaction(async function(transaction){
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              id: 1,
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              tags: ["magic", "awesome"],
              FinanceTransactionComponents: [ { amount: 42 }, { amount: 160 } ]
            }
          ]
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction});
        var account = createdUser.Accounts[0];
        var financeTransaction = createdUser.FinanceTransactions[0];
        await financeTransaction.FinanceTransactionComponents[0].setAccount(account, {transaction: transaction});
        await financeTransaction.FinanceTransactionComponents[1].setAccount(account, {transaction: transaction});
        await financeTransaction.setUser(createdUser, {transaction: transaction});
        return createdUser;
      });
      await dbService.sequelize.transaction(async function(transaction){
        await dbService.Account.create({
          name: "orphaned account 1",
          currency: "RUB",
          includeInTotal: true,
          showInList: true
        }, {transaction: transaction});
        await dbService.FinanceTransaction.create({
          description: "orphaned transaction 1",
          type: "expenseincome",
          date: currentDate(),
          tags: ["magic", "awesome"],
          FinanceTransactionComponents: [ { amount: 9 }, { amount: 27 } ]
        }, {include: dbService.FinanceTransactionComponent, transaction: transaction});
        await dbService.FinanceTransactionComponent.create({ amount: 314 }, {transaction: transaction});
        var financeTransactionComponent = await dbService.FinanceTransactionComponent.create({ amount: 7 }, {transaction: transaction});
        await financeTransactionComponent.setAccount(user.Accounts[0], {transaction: transaction});
      });
      var accounts = await dbService.Account.findAll();
      assert.equal(accounts.length, 2);
      assert.equal(accounts.some(function(account){ return account.name === "orphaned account 1"; }), true);
      var financeTransactions = await dbService.FinanceTransaction.findAll();
      assert.equal(financeTransactions.length, 2);
      assert.equal(financeTransactions.some(function(financeTransaction){ return financeTransaction.description === "orphaned transaction 1"; }), true);

      var financeTransactionComponents = await dbService.FinanceTransactionComponent.findAll();
      assert.equal(financeTransactionComponents.length, 6);
      assert.equal(financeTransactionComponents.some(function(financeTransactionComponent){ return financeTransactionComponent.amount === 314; }), true);
      assert.equal(financeTransactionComponents.some(function(financeTransactionComponent){ return financeTransactionComponent.amount === 7; }), true);

      await dbService.performMaintenance();
      var accounts = await dbService.Account.findAll();
      assert.equal(accounts.length, 1);
      assert.equal(accounts[0].name, "test account 1");
      assert.equal(accounts[0].balance, 42 + 160);
      var financeTransactions = await dbService.FinanceTransaction.findAll();
      assert.equal(financeTransactions.length, 1);
      assert.equal(financeTransactions[0].description, "test transaction 1");
      var financeTransactionComponents = await dbService.FinanceTransactionComponent.findAll();
      assert.equal(financeTransactionComponents.length, 2);
      assert.equal(financeTransactionComponents.some(function(financeTransactionComponent){ return financeTransactionComponent.amount === 42; }), true);
      assert.equal(financeTransactionComponents.some(function(financeTransactionComponent){ return financeTransactionComponent.amount === 160; }), true);
    });
    it('should properly recalculate account balance during maintenance', async function () {
      var account = await dbService.sequelize.transaction(async function(transaction){
        var createdUser = await dbService.User.create({
          username: "user01",
          password: "mypassword",
          Accounts: [
            {
              id: 1,
              name: "test account 1",
              balance: 5,
              currency: "RUB",
              includeInTotal: true,
              showInList: true
            }
          ],
          FinanceTransactions: [
            {
              description: "test transaction 1",
              type: "expenseincome",
              date: currentDate(),
              tags: ["magic", "awesome"],
              FinanceTransactionComponents: [ { amount: 42 }, { amount: 160 } ]
            }
          ]
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction});
        account = createdUser.Accounts[0];
        var financeTransaction = createdUser.FinanceTransactions[0];
        await financeTransaction.FinanceTransactionComponents[0].setAccount(account, {transaction: transaction});
        await financeTransaction.FinanceTransactionComponents[1].setAccount(account, {transaction: transaction});
        await financeTransaction.setUser(createdUser, {transaction: transaction});
        return account;
      });
      await dbService.sequelize.transaction(function(transaction){
        return account.update({ balance: dbService.convertAmountToFixed(11) }, {transaction: transaction});
      });
      await account.reload();
      assert.equal(account.balance, 11);
      await dbService.performMaintenance();
      await account.reload();
      assert.equal(account.balance, 42 + 160);
    });
  });
});
