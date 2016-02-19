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
      return JSON.parse(this.getDataValue("tags"));
    },
    set: function(value) {
      if(!Array.isArray(value))
        throw new Error("Tags must be an array");
      this.setDataValue("tags", JSON.stringify(value));
    }
  },
  date: Sequelize.DATE
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
  var updatePreviousAccount = function(){
    return Account.findById(previousAccount).then(function(account){
      return account.decrement("balance", {by: previousAmount});
    });
  };
  var updateNewAccount = function(){
    return Account.findById(transactionComponent.AccountId).then(function(account){
      return account.increment("balance", {by: transactionComponent.getDataValue("amount")});
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
  var updatePreviousAccount = function(){
    return Account.findById(previousAccount).then(function(account){
      return account.decrement("balance", {by: previousAmount});
    });
  };
  return updatePreviousAccount();
});

exports.sequelize = sequelize;
exports.User = User;
exports.Transaction = Transaction;
exports.TransactionComponent = TransactionComponent;
exports.Account = Account;
