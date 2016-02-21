var Sequelize = require('sequelize');
var path = require('path');
var os = require('os');
var i18n = require('i18n');

var sequelizeConfigurer = function(){
  if(process.env.DATABASE_URL !== undefined)
    return new Sequelize(process.env.DATABASE_URL);
  else
    return new Sequelize("sqlite:", {storage: path.resolve(os.tmpdir(), "vogon-nj.sqlite")});
};

var sequelize = sequelizeConfigurer();

var fixedPointMultiplier = 100.0;
var convertAmountToFloat = function (amount){
  return amount / fixedPointMultiplier;
};
var convertAmountToFixed = function (amount){
  return (amount * fixedPointMultiplier).toFixed();
};

/**
 * Model
 */
var Account = sequelize.define('Account', {
  name: Sequelize.STRING,
  balance: {
    type: Sequelize.BIGINT,
    get: function(){
      return convertAmountToFloat(this.getDataValue("balance"));
    }
  },
  currency: Sequelize.STRING,
  includeInTotal: Sequelize.BOOLEAN,
  showInList: Sequelize.BOOLEAN
}, {
  timestamps: false
});

var Transaction = sequelize.define('Transaction', {
  type: Sequelize.ENUM("expenseincome", "transfer"),
  description: Sequelize.STRING,
  tags: {
    type: Sequelize.STRING,
    get: function() {
      if(this.getDataValue("tags") === undefined)
        return undefined;
      return JSON.parse(this.getDataValue("tags")).filter(function(tag){ return tag !== undefined && tag.length>0; });
    },
    set: function(value) {
      if(!Array.isArray(value))
        throw new Error("Tags must be an array");
      this.setDataValue("tags", JSON.stringify(value.sort()));
    }
  },
  date: Sequelize.DATEONLY
}, {
  timestamps: false
});

var TransactionComponent = sequelize.define('TransactionComponent', {
  amount: {
    type: Sequelize.BIGINT,
    get: function(){
      return convertAmountToFloat(this.getDataValue("amount"));
    },
    set: function(val){
      this.setDataValue("amount", convertAmountToFixed(val));
    }
  }
}, {
  timestamps: false
});

var User = sequelize.define('User', {
  username: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  password: Sequelize.STRING
}, {
  timestamps: false
});

/**
 * Associations
 */
TransactionComponent.belongsTo(Transaction);
TransactionComponent.belongsTo(Account);
Transaction.hasMany(TransactionComponent, {onDelete: 'cascade', hooks:true});
Transaction.belongsTo(User);
User.hasMany(Transaction, {onDelete: 'cascade', hooks:true});
User.hasMany(Account, {onDelete: 'cascade', hooks:true});
Account.hasMany(TransactionComponent, {onDelete: 'cascade', hooks:true});

/**
 * Hooks
 */
//TODO: set default values or do validation for all fields
Account.hook('beforeCreate', function(account, options){
  account.balance = 0;
});

TransactionComponent.hook('afterUpdate', function(transactionComponent, options){
  var previousAccount = transactionComponent.previous("AccountId");
  var previousAmount = transactionComponent.previous("amount");

  if(transactionComponent.AccountId === undefined && previousAccount === undefined)
    return sequelize.Promise.resolve();

  if(options === undefined || options.transaction === undefined)
    return sequelize.Promise.reject(new Error(i18n.__("TransactionComponent afterUpdate hook can only be run from a transaction")));
  var transaction = options.transaction;

  var updatePreviousAccount = function(){
    return Account.findById(previousAccount, {transaction: transaction}).then(function(account){
      return account.decrement("balance", {by: previousAmount, transaction: transaction});
    });
  };
  var updateNewAccount = function(){
    return Account.findById(transactionComponent.AccountId, {transaction: transaction}).then(function(account){
      return account.increment("balance", {by: transactionComponent.getDataValue("amount"), transaction: transaction});
    });
  };
  if(previousAccount !== undefined && transactionComponent.AccountId !== undefined)
    return updatePreviousAccount().then(updateNewAccount());
  if(previousAccount !== undefined && transactionComponent.AccountId === undefined)
    return updatePreviousAccount();
  if(previousAccount === undefined && transactionComponent.AccountId !== undefined)
    return updateNewAccount();
  return sequelize.Promise.resolve();
});

TransactionComponent.hook('afterDestroy', function(transactionComponent, options){
  var previousAccount = transactionComponent.previous("AccountId");
  var previousAmount = transactionComponent.previous("amount");
  if(previousAccount === undefined)
    return sequelize.Promise.resolve();

  if(options === undefined || options.transaction === undefined)
    return sequelize.Promise.reject(new Error(i18n.__("TransactionComponent afterDestroy hook can only be run from a transaction")));

  var transaction = options.transaction;
  var updatePreviousAccount = function(){
    return Account.findById(previousAccount, {transaction: transaction}).then(function(account){
      return account.decrement("balance", {by: previousAmount, transaction: transaction});
    });
  };
  return updatePreviousAccount();
});

/**
 * Helper tools
 */
var importData = function(user, data, options){
  var accountRemappings = {};
  var createdAccounts = undefined;
  var createdTransactions = undefined;

  if(options === undefined || options.transaction === undefined)
    return sequelize.Promise.reject(new Error(i18n.__("Import can only be run from a transaction")));
  if(user === undefined)
    return sequelize.Promise.reject(new Error(i18n.__("Cannot import data for unknown user")));
  var t = options.transaction;

  //Java version workarounds
  if(data.accounts !== undefined){
    data.Accounts = data.accounts;
    delete data.accounts;
  }
  if(data.transactions !== undefined){
    data.Transactions = data.transactions.map(function(transaction){
      transaction.TransactionComponents = transaction.components.map(function(transactionComponent){
        transactionComponent.AccountId = transactionComponent.accountId;
        delete transactionComponent.accountId;
        return transactionComponent;
      });
      delete transaction.components;
      return transaction;
    });
    delete data.transactions;
  }

  //Preprocess data
  data.Accounts = data.Accounts.map(function(account, i){
      accountRemappings[account.id] = i;
      delete account.id;
      return account;
  });
  data.Transactions = data.Transactions.map(function(transaction){
    delete transaction.id;
    transaction.type = transaction.type.toLowerCase();
    transaction.TransactionComponents = transaction.TransactionComponents.map(function(transactionComponent){
      delete transactionComponent.id;
      return transactionComponent;
    });
    return transaction;
  });

  return Promise.all(data.Accounts.map(function(account){
    return Account.create(account, {transaction: t});
  })).then(function(accounts){
    createdAccounts = accounts;
    return user.addAccounts(accounts, {transaction: t});
  }).then(function(){
    return Promise.all(data.Transactions.map(function(transaction, i){
      transaction.TransactionComponents = transaction.TransactionComponents.map(function(transactionComponent, j){
        var accountId = transactionComponent.AccountId;
        delete transactionComponent.AccountId;
        transactionComponent.getAccount = function(){
          return createdAccounts[accountRemappings[accountId]];
        };
        return transactionComponent;
      });
      return Transaction.create(transaction, {include: [TransactionComponent], transaction: t});
    }));
  }).then(function(transactions){
    createdTransactions = transactions;
    return user.addTransactions(transactions, {transaction: t});
  }).then(function(){
    var promises = [];
    createdTransactions.forEach(function(transaction,i){
      createdTransactions[i].TransactionComponents.forEach(function(transactionComponent, j){
        var account = data.Transactions[i].TransactionComponents[j].getAccount();
        promises.push(transactionComponent.setAccount(account, {transaction: t}));
      });
    });
    return Promise.all(promises);
  });
};

var exportData = function(user){
  if(user === undefined)
    return sequelize.Promise.reject(new Error(i18n.__("Cannot export data for unknown user")));
  return sequelize.transaction(function(transaction){
    return user.reload({
      include: [Account, {model: Transaction, include: [TransactionComponent]}],
      order: [
        [Account, "id", "ASC"],
        [Transaction, "id", "ASC"],
        [Transaction, TransactionComponent, "id", "ASC"]
      ],
      transaction: transaction
    });
  }).then(function(user){
    user = user.toJSON();
    delete user.password;
    user.Accounts = user.Accounts.map(function(account){
      delete account.UserUsername;
      return account;
    });
    user.Transactions = user.Transactions.map(function(transaction){
      delete transaction.UserUsername;
      return transaction;
    }).map(function(transaction){
      transaction.TransactionComponents = transaction.TransactionComponents.map(function(transactionComponent){
        delete transactionComponent.TransactionId;
        return transactionComponent;
      });
      return transaction;
    });
    return user;
  });
};

exports.sequelize = sequelize;
exports.importData = importData;
exports.exportData = exportData;

exports.User = User;
exports.Transaction = Transaction;
exports.TransactionComponent = TransactionComponent;
exports.Account = Account;
