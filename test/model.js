var assert = require('assert');
var dbService = require('../model/service');
var fs = require('fs');

var currentDate = function(){
  var currentTime = new Date();
  return new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()).toJSON().split("T")[0];
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
      dbService.sequelize.transaction(function(transaction){
        return user1.save({transaction: transaction}).then(function(){
          return account1.save({transaction: transaction});
        }).then(function(){
          return user1.addAccount(account1, {transaction: transaction});
        }).then(function(){
          return transaction1.save({transaction: transaction});
        }).then(function(){
          return user1.addFinanceTransaction(transaction1, {transaction: transaction});
        }).then(function(){
          return transactionComponent1.save({transaction: transaction});
        }).then(function(){
          return transactionComponent1.setFinanceTransaction(transaction1, {transaction: transaction});
        }).then(function(){
          return transactionComponent1.setAccount(account1, {transaction: transaction});
        });
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
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
        done();
      }).catch(done);
    });
    it('should be able to create related entities all at once', function (done) {
      var user = undefined;
      dbService.sequelize.transaction(function(transaction){
        return dbService.User.create({
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
        }, {include: [dbService.Account, dbService.FinanceTransaction], transaction: transaction}).then(function(createdUser){
          user = createdUser;
          return dbService.FinanceTransactionComponent.create({
            amount: 100
          }, {transaction: transaction});
        }).then(function(transactionComponent){
          return transactionComponent.setFinanceTransaction(user.FinanceTransactions[0], {transaction: transaction});
        }).then(function(transactionComponent){
          return transactionComponent.setAccount(user.Accounts[0], {transaction: transaction});
        });
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
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
        done();
      }).catch(done);
    });
    it('should correctly handle adding a transaction', function (done) {
      var user = undefined;
      var account1 = undefined;
      dbService.sequelize.transaction(function(transaction){
        return dbService.User.create({
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
        }, {include: [dbService.Account], transaction: transaction}).then(function(createdUser){
          user = createdUser;
          account1 = user.Accounts[0];
          return dbService.FinanceTransaction.create({
            description: "test transaction 1",
            type: "expenseincome",
            date: currentDate(),
              FinanceTransactionComponents: [ { amount: 42 } ]
          }, {include: [dbService.FinanceTransactionComponent], transaction: transaction});
        }).then(function(createdTransaction){
          return createdTransaction.setUser(user, {transaction: transaction});
        }).then(function(createdTransaction){
          return createdTransaction.FinanceTransactionComponents[0].setAccount(account1, {include: [dbService.FinanceTransaction], transaction: transaction});
        });
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
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
        done();
      }).catch(done);
    });
    it('should correctly handle changing a transaction amount', function (done) {
      var transactionComponent1 = undefined;
      dbService.sequelize.transaction(function(transaction){
        return dbService.User.create({
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
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(createdUser){
          var account1 = createdUser.Accounts[0];
          var transaction1 = createdUser.FinanceTransactions[0];
          transactionComponent1 = transaction1.FinanceTransactionComponents[0];
          return transactionComponent1.setAccount(account1, {transaction: transaction}).then(function(){
            return transaction1.setUser(createdUser, {transaction: transaction});
          });
        }).then(function(){
          transactionComponent1.amount = 50;
          return transactionComponent1.save({transaction: transaction});
        });
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
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
        assert.equal(user.FinanceTransactions.length, 1);
        var transaction = user.FinanceTransactions[0];
        assert.equal(transaction.description,  "test transaction 1");
        assert.equal(transaction.FinanceTransactionComponents.length, 1);
        var component = transaction.FinanceTransactionComponents[0];
        assert.equal(component.AccountId, account1.id);
        assert.equal(component.FinanceTransactionId, transaction.id);
        done();
      }).catch(done);
    });
    it('should correctly handle changing a transaction component account', function (done) {
      var transactionComponent2 = undefined;
      var account2 = undefined;
      dbService.sequelize.transaction(function(transaction){
        return dbService.User.create({
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
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(createdUser){
          var account1 = createdUser.Accounts[0];
          account2 = createdUser.Accounts[1];
          var transaction1 = createdUser.FinanceTransactions[0];
          var transactionComponent1 = transaction1.FinanceTransactionComponents[0];
          transactionComponent2 = transaction1.FinanceTransactionComponents[1];
          return transactionComponent1.setAccount(account1, {transaction: transaction}).then(function(){
            return transactionComponent2.setAccount(account1, {transaction: transaction});
          }).then(function(){
            return transaction1.setUser(createdUser, {transaction: transaction});
          })
        });
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
        });
      }).then(function(users){
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
      }).then(function(){
        return dbService.sequelize.transaction(function(transaction){
          return transactionComponent2.setAccount(account2, {transaction: transaction});
        });
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
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
        done();
      }).catch(done);
    });
    it('should correctly handle adding a transaction component to an existing transaction', function (done) {
      var transaction1 = undefined;
      var account1 = undefined;
      dbService.sequelize.transaction(function(transaction){
        return dbService.User.create({
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
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(createdUser){
          account1 = createdUser.Accounts[0];
          transaction1 = createdUser.FinanceTransactions[0];
          var transactionComponent1 = transaction1.FinanceTransactionComponents[0];
          return transactionComponent1.setAccount(account1, {transaction: transaction}).then(function(){
            return transaction1.setUser(createdUser);
          });
        }).then(function(){
          return dbService.FinanceTransactionComponent.create({
            amount: 160
          }, {transaction: transaction});
        }).then(function(transactionComponent){
            return transactionComponent.setAccount(account1, {transaction: transaction});
        }).then(function(transactionComponent){
            return transactionComponent.setFinanceTransaction(transaction1, {transaction: transaction});
        });
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
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
        done();
      }).catch(done);
    });
    it('should correctly handle deleting a transaction component from an existing transaction', function (done) {
      var transactionComponent2 = undefined;
      dbService.sequelize.transaction(function(transaction){
        return dbService.User.create({
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
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(createdUser){
          var account1 = createdUser.Accounts[0];
          var transaction1 = createdUser.FinanceTransactions[0];
          var transactionComponent1 = transaction1.FinanceTransactionComponents[0];
          transactionComponent2 = transaction1.FinanceTransactionComponents[1];
          return transactionComponent1.setAccount(account1, {transaction: transaction}).then(function(){
            return transactionComponent2.setAccount(account1, {transaction: transaction});
          }).then(function(){
            return transaction1.setUser(createdUser, {transaction: transaction});
          })
        }).then(function(){
          return transactionComponent2.destroy({transaction: transaction});
        });
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
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
        assert.equal(user.FinanceTransactions.length, 1);
        var transaction = user.FinanceTransactions[0];
        assert.equal(transaction.FinanceTransactionComponents.length, 1);
        var component1 = transaction.FinanceTransactionComponents[0];
        assert.equal(component1.amount, 42);
        assert.equal(component1.AccountId, account1.id);
        assert.equal(component1.FinanceTransactionId, transaction.id);
        done();
      }).catch(done);
    });
    it('should correctly handle deleting a transaction', function (done) {
      var transaction2 = undefined;
      dbService.sequelize.transaction(function(transaction){
        return dbService.User.create({
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
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(createdUser){
          var account1 = createdUser.Accounts[0];
          var account2 = createdUser.Accounts[1];
          var transaction1 = createdUser.FinanceTransactions[0];
          transaction2 = createdUser.FinanceTransactions[1];
          return transaction1.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction}).then(function(){
            return transaction1.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
          }).then(function(){
            return transaction2.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction});
          }).then(function(){
            return transaction2.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
          }).then(function(){
            return transaction1.setUser(createdUser, {transaction: transaction});
          }).then(function(){
            return transaction2.setUser(createdUser, {transaction: transaction});
          });
        }).then(function(){
          return transaction2.destroy({transaction: transaction});
        });
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
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
        done();
      }).catch(done);
    });
    it('should correctly handle deleting an account', function (done) {
      var account2 = undefined;
      dbService.sequelize.transaction(function(transaction){
        return dbService.User.create({
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
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(createdUser){
          var account1 = createdUser.Accounts[0];
          account2 = createdUser.Accounts[1];
          var transaction1 = createdUser.FinanceTransactions[0];
          var transaction2 = createdUser.FinanceTransactions[1];
          return transaction1.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction}).then(function(){
            return transaction1.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
          }).then(function(){
            return transaction2.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction});
          }).then(function(){
            return transaction2.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
          }).then(function(){
            return transaction1.setUser(createdUser, {transaction: transaction});
          }).then(function(){
            return transaction2.setUser(createdUser, {transaction: transaction});
          });
        }).then(function(){
          return account2.destroy({transaction: transaction});
        });
      }).then(function(){
        return dbService.User.findAll({
          include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}]
        });
      }).then(function(users){
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
        done();
      }).catch(done);
    });
    it('should correctly handle import data from the java version of vogon', function (done) {
      dbService.User.create({
        username: "user01",
        password: "mypassword"
      }).then(function(user){
        return fs.readFile("./test/data/vogon-java-export.json", function(error, data){
          if (error) done(error);
          data = JSON.parse(data);
          dbService.sequelize.transaction(function (transaction) {
            return dbService.importData(user, data, {transaction: transaction});
          }).then(function(){
            dbService.exportData(user).then(function(exportData){console.log(JSON.stringify(exportData))});
          }).then(function(){
            return dbService.User.findAll({
              include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}],
              order: [
                [dbService.Account, "id", "ASC"],
                [dbService.FinanceTransaction, "id", "ASC"],
                [dbService.FinanceTransaction, dbService.FinanceTransactionComponent, "id", "ASC"]
              ]
            });
          }).then(function(users){
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

            done();
          }).catch(done);
        });
      });
    });
    it('should correctly handle import data from the node.js version of vogon', function (done) {
      dbService.User.create({
        username: "user01",
        password: "mypassword"
      }).then(function(user){
        return fs.readFile("./test/data/vogon-nodejs-export.json", function(error, data){
          if (error) done(error);
          data = JSON.parse(data);
          dbService.sequelize.transaction(function (transaction) {
            return dbService.importData(user, data, {transaction: transaction});
          }).then(function(){
            dbService.exportData(user).then(function(exportData){console.log(JSON.stringify(exportData))});
          }).then(function(){
            return dbService.User.findAll({
              include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}],
              order: [
                [dbService.Account, "id", "ASC"],
                [dbService.FinanceTransaction, "id", "ASC"],
                [dbService.FinanceTransaction, dbService.FinanceTransactionComponent, "id", "ASC"]
              ]
            });
          }).then(function(users){
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

            done();
          }).catch(done);
        });
      });
    });
    it('should correctly handle exporting data', function (done) {
      var user = undefined;
      dbService.sequelize.transaction(function (transaction) {
        return dbService.User.create({
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
        }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(createdUser){
          user = createdUser;
          var account1 = createdUser.Accounts[0];
          var account2 = createdUser.Accounts[1];
          var transaction1 = createdUser.FinanceTransactions[0];
          var transaction2 = createdUser.FinanceTransactions[1];
          return transaction1.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction}).then(function(){
            return transaction1.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
          }).then(function(){
            return transaction2.FinanceTransactionComponents[0].setAccount(account1, {transaction: transaction});
          }).then(function(){
            return transaction2.FinanceTransactionComponents[1].setAccount(account2, {transaction: transaction});
          }).then(function(){
            return transaction1.setUser(createdUser, {transaction: transaction});
          }).then(function(){
            return transaction2.setUser(createdUser, {transaction: transaction});
          });
        });
      }).then(function(){
        return dbService.exportData(user);
      }).then(function(exportData){
        assert.deepEqual(exportData, {
          username:"user01",
          Accounts:[
            {id:1, name:"test account 1", balance:49, currency:"RUB", includeInTotal:true, showInList:true},
            {id:2, name:"test account 2", balance:173, currency:"RUB", includeInTotal:true, showInList:true}
          ],
          FinanceTransactions:[
            {id:1, type:"expenseincome", description:"test transaction 1", date:currentDate(), tags:["awesome","magic"], FinanceTransactionComponents:[{id:1 ,amount:42, AccountId:1}, {id:2, amount:160, AccountId:2}]},
            {id:2, type:"expenseincome", description:"test transaction 2", date:currentDate(), tags:["magic"], FinanceTransactionComponents:[{id:3, amount:7, AccountId:1}, {id:4, amount:13, AccountId:2}]}]});
        done();
      }).catch(done);
    });
  });
});
