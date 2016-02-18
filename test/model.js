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
        assert.equal(users.length, 1, "check users count");
        var user = users[0];
        assert.equal(user.username, "user01", "check user01 username");
        assert.equal(user.password, "mypassword", "check user01 password");
        assert.equal(user.Accounts.length, 1, "check accounts count");
        var account = user.Accounts[0];
        assert.equal(account.name, "test account 1", "check account name");
        assert.equal(account.balance, 100, "check account balance");
        assert.equal(account.currency, "RUB", "check account currency");
        assert.equal(account.includeInTotal, true, "check account includeInTotal");
        assert.equal(account.showInList, true, "check account showInList");
        assert.equal(user.Transactions.length, 1, "check transactions count");
        var transaction = user.Transactions[0];
        assert.equal(transaction.description,  "test transaction 1", "check transaction description");
        assert.equal(transaction.type, "expenseincome", "check transaction type");
        assert.equal(transaction.date.getTime(), currentDate().getTime(), "check transaction date");
        assert.equal(transaction.amount, 100, "check transaction amount");
        assert.deepEqual(transaction.tags, ["hello", "world"], "check transaction tags");
        assert.equal(transaction.TransactionComponents.length, 1, "check transaction components count");
        var component = transaction.TransactionComponents[0];
        assert.equal(component.amount, 100, "check component amount");
        assert.equal(component.AccountId, account.id, "check component account");
        assert.equal(component.TransactionId, transaction.id, "check component transaction");
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
        assert.equal(users.length, 1, "check users count");
        var user = users[0];
        assert.equal(user.username, "user01", "check user01 username");
        assert.equal(user.password, "mypassword", "check user01 password");
        assert.equal(user.Accounts.length, 1, "check accounts count");
        var account = user.Accounts[0];
        assert.equal(account.name, "test account 1", "check account name");
        assert.equal(account.balance, 100, "check account balance");
        assert.equal(account.currency, "RUB", "check account currency");
        assert.equal(account.includeInTotal, true, "check account includeInTotal");
        assert.equal(account.showInList, true, "check account showInList");
        assert.equal(user.Transactions.length, 1, "check transactions count");
        var transaction = user.Transactions[0];
        assert.equal(transaction.description,  "test transaction 1", "check transaction description");
        assert.equal(transaction.type, "expenseincome", "check transaction type");
        assert.deepEqual(transaction.tags, ["hello", "world"], "check transaction tags");
        assert.equal(transaction.date.getTime(), currentDate().getTime(), "check transaction date");
        assert.equal(transaction.amount, 100, "check transaction amount");
        assert.equal(transaction.TransactionComponents.length, 1, "check transaction components count");
        var component = transaction.TransactionComponents[0];
        assert.equal(component.amount, 100, "check component amount");
        assert.equal(component.AccountId, account.id, "check component account");
        assert.equal(component.TransactionId, transaction.id, "check component transaction");
        done();
      });
    });
  });
});
