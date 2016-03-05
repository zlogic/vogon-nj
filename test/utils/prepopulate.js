var dbService = require('../../services/model');

var prepopulate = function(){
  var users;
  return dbService.sequelize.transaction(function(transaction){
    return dbService.User.create({
      username: "user01",
      password: "mypassword",
      Accounts: [
        {
          name: "test account 1",
          currency: "RUB",
          includeInTotal: true,
          showInList: true
        }, {
          name: "test account 2",
          currency: "EUR",
          includeInTotal: true,
          showInList: true
        }
      ],
      FinanceTransactions: [
        {
          description: "test transaction 1",
          type: "expenseincome",
          date: "2014-02-17",
          tags: ["hello", "world"],
          FinanceTransactionComponents: [
            {amount: 42}, {amount: 160}
          ]
        }, {
          description: "test transaction 3",
          type: "expenseincome",
          date: "2014-02-17",
          tags: [],
        }, {
          description: "test transaction 2",
          type: "expenseincome",
          date: "2015-01-07",
          tags: ["magic", "hello"],
          FinanceTransactionComponents: [
            {amount: 3.14}, {amount: 2.72}
          ]
        }
      ]
    }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(user){
      return user.FinanceTransactions[0].FinanceTransactionComponents[0].setAccount(user.Accounts[0], {transaction: transaction}).then(function(){
        return user.FinanceTransactions[0].FinanceTransactionComponents[1].setAccount(user.Accounts[1], {transaction: transaction})
      }).then(function(){
        return user.FinanceTransactions[2].FinanceTransactionComponents[0].setAccount(user.Accounts[1], {transaction: transaction})
      }).then(function(){
        return user.FinanceTransactions[2].FinanceTransactionComponents[1].setAccount(user.Accounts[0], {transaction: transaction})
      });
    }).then(function(){
      return dbService.User.create({
        username: "user02",
        password: "mypassword2",
        Accounts: [
          {
            name: "test account 3",
            currency: "RUB",
            includeInTotal: true,
            showInList: true
          }
        ],
        FinanceTransactions: [
          {
            description: "test transaction 3",
            type: "expenseincome",
            date: "2014-05-17",
            tags: ["hello", "everyone"],
            FinanceTransactionComponents: [
              {amount: 100}
            ]
          }
        ]
      }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(user){
        return dbService.sequelize.Promise.all([
          user.FinanceTransactions[0].FinanceTransactionComponents[0].setAccount(user.Accounts[0], {transaction: transaction})
        ]);
      });
    });
  });
};

module.exports = prepopulate;
