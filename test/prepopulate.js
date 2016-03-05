var dbService = require('../services/model');

var prepopulate = function(){
  var users;
  return dbService.sequelize.transaction(function(transaction){
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
          date: "2014-02-17",
          tags: ["hello", "world"],
          amount: 3,
          FinanceTransactionComponents: [
            {amount: 100}
          ]
        }
      ]
    }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(user){
      return dbService.sequelize.Promise.all([
        user.FinanceTransactions[0].FinanceTransactionComponents[0].setAccount(user.Accounts[0], {transaction: transaction})
      ]);
    }).then(function(){
      return dbService.User.create({
        username: "user02",
        password: "mypassword2",
        Accounts: [
          {
            name: "test account 3",
            balance: 5,
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
            tags: ["hello", "world"],
            amount: 3,
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
