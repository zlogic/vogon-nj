var dbService = require('../services/model');

var prepopulate = function(){
  var user;
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
    }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction}).then(function(createdUser){
      user = createdUser;
      return user.FinanceTransactions[0].FinanceTransactionComponents[0].setAccount(user.Accounts[0], {transaction: transaction});
    });
  });
}

module.exports = prepopulate;
