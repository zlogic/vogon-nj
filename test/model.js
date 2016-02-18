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

  describe('populate', function () {
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
  });
});
