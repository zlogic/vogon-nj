var Sequelize = require('sequelize');
var path = require('path');
var os = require('os');

var sequelizeConfigurer = function(){
  if(process.env.DATABASE_URL !== undefined)
    return new Sequelize(process.env.DATABASE_URL);
  else
    return new Sequelize("sqlite:", {storage: path.resolve(os.tmpdir(), "vogon-nj.sqlite")});
};

var sequelize = sequelizeConfigurer();

/**
 * Model
 */
var Account = sequelize.define('Account', {
  name: Sequelize.STRING,
  balance: Sequelize.BIGINT,
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
      return JSON.parse(this.getDataValue("tags"));
    },
    set: function(value) {
      if(!Array.isArray(value))
        throw new Error("Tags must be an array");
      this.setDataValue("tags", JSON.stringify(value));
    }
  },
  date: Sequelize.DATE,
  //TODO: Delete this, as this doesn't work well with currencies and is calculated on the client side
  amount: {
    type: Sequelize.VIRTUAL,
    get: function(){
      if(this.getDataValue("TransactionComponents") === undefined)
        return 0;
      return this.getDataValue("TransactionComponents").reduce(function(acc, transactionComponent){
        return acc + transactionComponent.amount;
      }, 0);
    }
  }
}, {
  timestamps: false
});

var TransactionComponent = sequelize.define('TransactionComponent', {
  amount: Sequelize.BIGINT
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
Transaction.hasMany(TransactionComponent);
Transaction.belongsTo(User);
User.hasMany(Transaction);
User.hasMany(Account);

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
    return;
  var updatePreviousAccount = function(){
    return Account.findById(previousAccount).then(function(account){
      return account.decrement("balance", {by: previousAmount});
    });
  };
  var updateNewAccount = function(){
    return Account.findById(transactionComponent.AccountId).then(function(account){
      return account.increment("balance", {by: transactionComponent.amount});
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

exports.sequelize = sequelize;
exports.User = User;
exports.Transaction = Transaction;
exports.TransactionComponent = TransactionComponent;
exports.Account = Account;
