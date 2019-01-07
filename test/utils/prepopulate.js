var dbService = require('../../services/dbservice');

var prepopulate = function() {
  return dbService.sequelize.transaction(async function(transaction){
    var user = await dbService.User.create({
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
          type: "transfer",
          date: "2014-02-17",
          tags: [],
        }, {
          description: "test transaction 2",
          type: "expenseincome",
          date: "2015-01-07",
          tags: ["magic", "hello"],
          FinanceTransactionComponents: [
            {amount: -3.14}, {amount: 2.72}
          ]
        }
      ]
    }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction})
    await user.FinanceTransactions[0].FinanceTransactionComponents[0].setAccount(user.Accounts[0], {transaction: transaction});
    await user.FinanceTransactions[0].FinanceTransactionComponents[1].setAccount(user.Accounts[1], {transaction: transaction});
    await user.FinanceTransactions[2].FinanceTransactionComponents[0].setAccount(user.Accounts[1], {transaction: transaction});
    await user.FinanceTransactions[2].FinanceTransactionComponents[1].setAccount(user.Accounts[0], {transaction: transaction});
    user = await dbService.User.create({
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
          tags: [],
          FinanceTransactionComponents: [
            {amount: 100}
          ]
        }
      ]
    }, {include: [dbService.Account, {model: dbService.FinanceTransaction, include: [dbService.FinanceTransactionComponent]}], transaction: transaction})
    await user.FinanceTransactions[0].FinanceTransactionComponents[0].setAccount(user.Accounts[0], {transaction: transaction});
  });
};

var prepopulateExtra = async function(){
  await prepopulate();
  return dbService.sequelize.transaction(async function(transaction){
    var users = await dbService.User.findAll({transaction: transaction, include: [dbService.Account]})
    var financeTransaction = await dbService.FinanceTransaction.create({
      description: "test transaction 4",
      type: "transfer",
      date: "2014-06-07",
      tags: [],
      FinanceTransactionComponents: [
        {amount: -144}, {amount: 144}
      ]
    }, {include: [dbService.FinanceTransactionComponent], transaction: transaction});
    await Promise.all([
      financeTransaction.setUser(users[0], {transaction: transaction}),
      financeTransaction.FinanceTransactionComponents[0].setAccount(users[0].Accounts[0], {transaction: transaction}),
      financeTransaction.FinanceTransactionComponents[1].setAccount(users[0].Accounts[1], {transaction: transaction})
    ]);
  });
};

module.exports.prepopulate = prepopulate;
module.exports.prepopulateExtra = prepopulateExtra;
