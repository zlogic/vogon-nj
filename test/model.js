var assert = require('assert');
var dbService = require('../model/service');

var currentDate = function(){
  var currentTime = new Date();
  return new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
};

describe('Model', function() {
  beforeEach(function(done) {
    return dbService.sequelize.sync({force: true}).then(function(task){
      done();
    });
  });

  describe('operations', function () {
    it('should be able to create related entities in sequence', function (done) {
      var user1 = dbService.User.build({
        username: "user01",
        password: "mypassword"
      });
      var account1 = dbService.Account.build({
        name: "test account 1",
        balance: 5,
        currency: "RUB",
        includeInTotal: true,
        showInList: true
      });
      var transaction1 = dbService.Transaction.build({
        description: "test transaction 1",
        type: "expenseincome",
        date: currentDate(),
        tags: ["hello", "world"],
        amount: 3
      });
      var transactionComponent1 = dbService.TransactionComponent.build({
        amount: 100
      });
      user1.save().then(function(){
        return account1.save();
      }).then(function(){
        return user1.addAccount(account1);
      }).then(function(){
        return transaction1.save();
      }).then(function(){
        return user1.addTransaction(transaction1);
      }).then(function(){
        return transactionComponent1.save();
      }).then(function(){
        return transactionComponent1.setTransaction(transaction1);
      }).then(function(){
        return transactionComponent1.setAccount(account1);
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]
          //include: [{ all: true }]
        });
      }).then(function(users){
        assert.equal(users.length, 1);
        var user = users[0];
        assert.equal(user.username, "user01");
        assert.equal(user.password, "mypassword");
        assert.equal(user.Accounts.length, 1);
        var account = user.Accounts[0];
        assert.equal(account.name, "test account 1");
        assert.equal(account.balance, 100);
        assert.equal(account.currency, "RUB");
        assert.equal(account.includeInTotal, true);
        assert.equal(account.showInList, true);
        assert.equal(user.Transactions.length, 1);
        var transaction = user.Transactions[0];
        assert.equal(transaction.description,  "test transaction 1");
        assert.equal(transaction.type, "expenseincome");
        assert.equal(transaction.date.getTime(), currentDate().getTime());
        assert.equal(transaction.amount, 100);
        assert.deepEqual(transaction.tags, ["hello", "world"]);
        assert.equal(transaction.TransactionComponents.length, 1);
        var component = transaction.TransactionComponents[0];
        assert.equal(component.amount, 100);
        assert.equal(component.AccountId, account.id);
        assert.equal(component.TransactionId, transaction.id);
        done();
      });
    });
    it('should be able to create related entities all at once', function (done) {
      var user = undefined;
      dbService.User.create({
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
        Transactions: [
          {
            description: "test transaction 1",
            type: "expenseincome",
            date: currentDate(),
            tags: ["hello", "world"],
            amount: 3
          }
        ]
      }, {include: [dbService.Account, dbService.Transaction]}).then(function(createdUser){
        user = createdUser;
        return dbService.TransactionComponent.create({
          amount: 100
        });
      }).then(function(transactionComponent){
        return transactionComponent.setTransaction(user.Transactions[0]);
      }).then(function(transactionComponent){
        return transactionComponent.setAccount(user.Accounts[0]);
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]
        });
      }).then(function(users){
        assert.equal(users.length, 1);
        var user = users[0];
        assert.equal(user.username, "user01");
        assert.equal(user.password, "mypassword");
        assert.equal(user.Accounts.length, 1);
        var account = user.Accounts[0];
        assert.equal(account.name, "test account 1");
        assert.equal(account.balance, 100);
        assert.equal(account.currency, "RUB");
        assert.equal(account.includeInTotal, true);
        assert.equal(account.showInList, true);
        assert.equal(user.Transactions.length, 1);
        var transaction = user.Transactions[0];
        assert.equal(transaction.description,  "test transaction 1");
        assert.equal(transaction.type, "expenseincome");
        assert.equal(transaction.date.getTime(), currentDate().getTime());
        assert.equal(transaction.amount, 100);
        assert.deepEqual(transaction.tags, ["hello", "world"]);
        assert.equal(transaction.TransactionComponents.length, 1);
        var component = transaction.TransactionComponents[0];
        assert.equal(component.amount, 100);
        assert.equal(component.AccountId, account.id);
        assert.equal(component.TransactionId, transaction.id);
        done();
      });
    });
    it('should correctly handle adding a transaction', function (done) {
      var user = undefined;
      var account1 = undefined;
      dbService.User.create({
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
      }, {include: [dbService.Account]}).then(function(createdUser){
        user = createdUser;
        account1 = user.Accounts[0];
        return dbService.Transaction.create({
          description: "test transaction 1",
          type: "expenseincome",
          date: currentDate(),
            TransactionComponents: [ { amount: 42 } ]
        }, {include: [dbService.TransactionComponent]});
      }).then(function(transaction){
        return transaction.setUser(user);
      }).then(function(transaction){
        return transaction.TransactionComponents[0].setAccount(account1,{include: [dbService.Transaction]});
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]
        });
      }).then(function(users){
        assert.equal(users.length, 1);
        var user = users[0];
        assert.equal(user.Accounts.length, 2);
        var account1 = user.Accounts[0];
        assert.equal(account1.name, "test account 1");
        assert.equal(account1.balance, 42);
        var account2 = user.Accounts[1];
        assert.equal(account2.name, "test account 2");
        assert.equal(account2.balance, 0);
        assert.equal(user.Transactions.length, 1);
        var transaction = user.Transactions[0];
        assert.equal(transaction.description,  "test transaction 1");
        assert.equal(transaction.type, "expenseincome");
        assert.equal(transaction.date.getTime(), currentDate().getTime());
        assert.equal(transaction.amount, 42);
        assert.equal(transaction.TransactionComponents.length, 1);
        var component = transaction.TransactionComponents[0];
        assert.equal(component.amount, 42);
        assert.equal(component.AccountId, account1.id);
        assert.equal(component.TransactionId, transaction.id);
        done();
      });
    });
    it('should correctly handle changing a transaction amount', function (done) {
      var transactionComponent1 = undefined;
      dbService.User.create({
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
        Transactions: [
          {
            description: "test transaction 1",
            type: "expenseincome",
            date: currentDate(),
            TransactionComponents: [ { amount: 42 } ]
          }
        ],
      }, {include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]}).then(function(createdUser){
        var account1 = createdUser.Accounts[0];
        var transaction1 = createdUser.Transactions[0];
        transactionComponent1 = transaction1.TransactionComponents[0];
        return transactionComponent1.setAccount(account1).then(function(){
          return transaction1.setUser(createdUser);
        });
      }).then(function(){
        transactionComponent1.amount = 50;
        return transactionComponent1.save();
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]
        });
      }).then(function(users){
        assert.equal(users.length, 1);
        var user = users[0];
        assert.equal(user.Accounts.length, 2);
        var account1 = user.Accounts[0];
        assert.equal(account1.name, "test account 1");
        assert.equal(account1.balance, 50);
        var account2 = user.Accounts[1];
        assert.equal(account2.name, "test account 2");
        assert.equal(account2.balance, 0);
        assert.equal(user.Transactions.length, 1);
        var transaction = user.Transactions[0];
        assert.equal(transaction.description,  "test transaction 1");
        assert.equal(transaction.amount, 50);
        assert.equal(transaction.TransactionComponents.length, 1);
        var component = transaction.TransactionComponents[0];
        assert.equal(component.amount, 50);
        assert.equal(component.AccountId, account1.id);
        assert.equal(component.TransactionId, transaction.id);
        done();
      });
    });
    it('should correctly handle changing a transaction component account', function (done) {
      var transactionComponent2 = undefined;
      var account2 = undefined;
      dbService.User.create({
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
        Transactions: [
          {
            description: "test transaction 1",
            type: "expenseincome",
            date: currentDate(),
            TransactionComponents: [ { amount: 42 }, { amount: 160 } ]
          }
        ],
      }, {include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]}).then(function(createdUser){
        var account1 = createdUser.Accounts[0];
        account2 = createdUser.Accounts[1];
        var transaction1 = createdUser.Transactions[0];
        var transactionComponent1 = transaction1.TransactionComponents[0];
        transactionComponent2 = transaction1.TransactionComponents[1];
        return transactionComponent1.setAccount(account1).then(function(){
          return transactionComponent2.setAccount(account1);
        }).then(function(){
          return transaction1.setUser(createdUser);
        })
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]
        });
      }).then(function(users){
        assert.equal(users.length, 1);
        var user = users[0];
        assert.equal(user.Accounts.length, 2);
        var account1 = user.Accounts[0];
        assert.equal(account1.balance, 42+160);
        var account2 = user.Accounts[1];
        assert.equal(account2.balance, 0);
        assert.equal(user.Transactions.length, 1);
        var transaction = user.Transactions[0];
        assert.equal(transaction.amount, 42+160);
        assert.equal(transaction.TransactionComponents.length, 2);
        var component1 = transaction.TransactionComponents[0];
        var component2 = transaction.TransactionComponents[1];
        assert.equal(component1.amount, 42);
        assert.equal(component1.AccountId, account1.id);
        assert.equal(component1.TransactionId, transaction.id);
        assert.equal(component2.amount, 160);
        assert.equal(component2.AccountId, account1.id);
        assert.equal(component2.TransactionId, transaction.id);
      }).then(function(){
        return transactionComponent2.setAccount(account2);
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]
        });
      }).then(function(users){
        assert.equal(users.length, 1);
        var user = users[0];
        assert.equal(user.Accounts.length, 2);
        var account1 = user.Accounts[0];
        assert.equal(account1.name, "test account 1");
        assert.equal(account1.balance, 42);
        var account2 = user.Accounts[1];
        assert.equal(account2.name, "test account 2");
        assert.equal(account2.balance, 160);
        assert.equal(user.Transactions.length, 1);
        var transaction = user.Transactions[0];
        assert.equal(transaction.amount, 42+160);
        assert.equal(transaction.TransactionComponents.length, 2);
        var component1 = transaction.TransactionComponents[0];
        var component2 = transaction.TransactionComponents[1];
        assert.equal(component1.amount, 42);
        assert.equal(component1.AccountId, account1.id);
        assert.equal(component1.TransactionId, transaction.id);
        assert.equal(component2.amount, 160);
        assert.equal(component2.AccountId, account2.id);
        assert.equal(component2.TransactionId, transaction.id);
        done();
      });
    });
    it('should correctly handle adding a transaction component to an existing transaction', function (done) {
      var transaction1 = undefined;
      var account1 = undefined;
      dbService.User.create({
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
        Transactions: [
          {
            description: "test transaction 1",
            type: "expenseincome",
            date: currentDate(),
            TransactionComponents: [ { amount: 42 } ]
          }
        ],
      }, {include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]}).then(function(createdUser){
        account1 = createdUser.Accounts[0];
        transaction1 = createdUser.Transactions[0];
        var transactionComponent1 = transaction1.TransactionComponents[0];
        return transactionComponent1.setAccount(account1).then(function(){
          return transaction1.setUser(createdUser);
        });
      }).then(function(){
        return dbService.TransactionComponent.create({
          amount: 160
        });
      }).then(function(transactionComponent){
          return transactionComponent.setAccount(account1);
      }).then(function(transactionComponent){
          return transactionComponent.setTransaction(transaction1);
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]
        });
      }).then(function(users){
        assert.equal(users.length, 1);
        var user = users[0];
        assert.equal(user.Accounts.length, 2);
        var account1 = user.Accounts[0];
        assert.equal(account1.name, "test account 1");
        assert.equal(account1.balance, 42+160);
        var account2 = user.Accounts[1];
        assert.equal(account2.name, "test account 2");
        assert.equal(account2.balance, 0);
        assert.equal(user.Transactions.length, 1);
        var transaction = user.Transactions[0];
        assert.equal(transaction.amount, 42+160);
        assert.equal(transaction.TransactionComponents.length, 2);
        var component1 = transaction.TransactionComponents[0];
        var component2 = transaction.TransactionComponents[1];
        assert.equal(component1.amount, 42);
        assert.equal(component1.AccountId, account1.id);
        assert.equal(component1.TransactionId, transaction.id);
        assert.equal(component2.amount, 160);
        assert.equal(component2.AccountId, account1.id);
        assert.equal(component2.TransactionId, transaction.id);
        done();
      });
    });
    it('should correctly handle deleting a transaction component from an existing transaction', function (done) {
      var transactionComponent2 = undefined;
      dbService.User.create({
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
        Transactions: [
          {
            description: "test transaction 1",
            type: "expenseincome",
            date: currentDate(),
            TransactionComponents: [ { amount: 42 }, { amount: 160 } ]
          }
        ],
      }, {include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]}).then(function(createdUser){
        var account1 = createdUser.Accounts[0];
        var account2 = createdUser.Accounts[1];
        var transaction1 = createdUser.Transactions[0];
        var transactionComponent1 = transaction1.TransactionComponents[0];
        transactionComponent2 = transaction1.TransactionComponents[1];
        return transactionComponent1.setAccount(account1).then(function(){
          return transactionComponent2.setAccount(account1);
        }).then(function(){
          return transaction1.setUser(createdUser);
        })
      }).then(function(){
        return transactionComponent2.destroy();
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]
        });
      }).then(function(users){
        assert.equal(users.length, 1);
        var user = users[0];
        assert.equal(user.Accounts.length, 2);
        var account1 = user.Accounts[0];
        assert.equal(account1.name, "test account 1");
        assert.equal(account1.balance, 42);
        var account2 = user.Accounts[1];
        assert.equal(account2.name, "test account 2");
        assert.equal(account2.balance, 0);
        assert.equal(user.Transactions.length, 1);
        var transaction = user.Transactions[0];
        assert.equal(transaction.amount, 42);
        assert.equal(transaction.TransactionComponents.length, 1);
        var component1 = transaction.TransactionComponents[0];
        assert.equal(component1.amount, 42);
        assert.equal(component1.AccountId, account1.id);
        assert.equal(component1.TransactionId, transaction.id);
        done();
      });
    });
    it('should correctly handle deleting a transaction', function (done) {
      var transaction2 = undefined;
      dbService.User.create({
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
        Transactions: [
          {
            description: "test transaction 1",
            type: "expenseincome",
            date: currentDate(),
            TransactionComponents: [ { amount: 42 }, { amount: 160 } ]
          }, {
            description: "test transaction 2",
            type: "expenseincome",
            date: currentDate(),
            TransactionComponents: [ { amount: 7 }, { amount: 13 } ]
          }
        ],
      }, {include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]}).then(function(createdUser){
        var account1 = createdUser.Accounts[0];
        var account2 = createdUser.Accounts[1];
        var transaction1 = createdUser.Transactions[0];
        transaction2 = createdUser.Transactions[1];
        return transaction1.TransactionComponents[0].setAccount(account1).then(function(){
          return transaction1.TransactionComponents[1].setAccount(account2);
        }).then(function(){
          return transaction2.TransactionComponents[0].setAccount(account1);
        }).then(function(){
          return transaction2.TransactionComponents[1].setAccount(account2);
        }).then(function(){
          return transaction1.setUser(createdUser);
        }).then(function(){
          return transaction2.setUser(createdUser);
        });
      }).then(function(){
        return transaction2.destroy();
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]
        });
      }).then(function(users){
        assert.equal(users.length, 1);
        var user = users[0];
        assert.equal(user.Accounts.length, 2);
        var account1 = user.Accounts[0];
        assert.equal(account1.name, "test account 1");
        assert.equal(account1.balance, 42);
        var account2 = user.Accounts[1];
        assert.equal(account2.name, "test account 2");
        assert.equal(account2.balance, 160);
        assert.equal(user.Transactions.length, 1);
        var transaction = user.Transactions[0];
        assert.equal(transaction.amount, 42+160);
        assert.equal(transaction.TransactionComponents.length, 2);
        var component1 = transaction.TransactionComponents[0];
        assert.equal(component1.amount, 42);
        assert.equal(component1.AccountId, account1.id);
        assert.equal(component1.TransactionId, transaction.id);
        var component2 = transaction.TransactionComponents[1];
        assert.equal(component2.amount, 160);
        assert.equal(component2.AccountId, account2.id);
        assert.equal(component2.TransactionId, transaction.id);
        done();
      });
    });
    it('should correctly handle deleting an account', function (done) {
      var account2 = undefined;
      dbService.User.create({
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
        Transactions: [
          {
            description: "test transaction 1",
            type: "expenseincome",
            date: currentDate(),
            TransactionComponents: [ { amount: 42 }, { amount: 160 } ]
          }, {
            description: "test transaction 2",
            type: "expenseincome",
            date: currentDate(),
            TransactionComponents: [ { amount: 7 }, { amount: 13 } ]
          }
        ],
      }, {include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]}).then(function(createdUser){
        var account1 = createdUser.Accounts[0];
        account2 = createdUser.Accounts[1];
        var transaction1 = createdUser.Transactions[0];
        var transaction2 = createdUser.Transactions[1];
        return transaction1.TransactionComponents[0].setAccount(account1).then(function(){
          return transaction1.TransactionComponents[1].setAccount(account2);
        }).then(function(){
          return transaction2.TransactionComponents[0].setAccount(account1);
        }).then(function(){
          return transaction2.TransactionComponents[1].setAccount(account2);
        }).then(function(){
          return transaction1.setUser(createdUser);
        }).then(function(){
          return transaction2.setUser(createdUser);
        });
      }).then(function(){
        return account2.destroy();
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.Transaction, include: [dbService.TransactionComponent]}]
        });
      }).then(function(users){
        assert.equal(users.length, 1);
        var user = users[0];
        assert.equal(user.Accounts.length, 1);
        var account1 = user.Accounts[0];
        assert.equal(account1.name, "test account 1");
        assert.equal(account1.balance, 42+7);
        assert.equal(user.Transactions.length, 2);
        var transaction1 = user.Transactions[0];
        assert.equal(transaction1.amount, 42);
        assert.equal(transaction1.TransactionComponents.length, 1);
        var component1 = transaction1.TransactionComponents[0];
        assert.equal(component1.amount, 42);
        assert.equal(component1.AccountId, account1.id);
        assert.equal(component1.TransactionId, transaction1.id);
        var transaction2 = user.Transactions[1];
        assert.equal(transaction2.amount, 7);
        assert.equal(transaction2.TransactionComponents.length, 1);
        var component2 = transaction2.TransactionComponents[0];
        assert.equal(component2.amount, 7);
        assert.equal(component2.AccountId, account1.id);
        assert.equal(component2.TransactionId, transaction2.id);
        done();
      });
    });
  });
});
