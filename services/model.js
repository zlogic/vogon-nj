var Sequelize = require('sequelize');
var path = require('path');
var os = require('os');
var i18n = require('i18n');
var crypto = require('crypto');
var logger = require('./logger').logger;

var sequelizeConfigurer = function(){
  if(process.env.DATABASE_URL !== undefined)
    return new Sequelize(process.env.DATABASE_URL, {isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.debug});
  else
    return new Sequelize("sqlite:", {storage: path.resolve(os.tmpdir(), "vogon-nj.sqlite"), isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.debug});
};

var sequelize = sequelizeConfigurer();

var fixedPointMultiplier = 100.0;
var convertAmountToFloat = function (amount){
  return amount / fixedPointMultiplier;
};
var convertAmountToFixed = function (amount){
  return (amount * fixedPointMultiplier).toFixed();
};

var hashPassword = function(password, salt, options, done){
  if(options === null || options === undefined)
    options = {
      iterations: 10000,
      keylen: 512,
      digest: 'sha512',
      saltlen: 256
    };
  var pbkdf2 = function(salt){
    crypto.pbkdf2(password, salt, options.iterations, options.keylen, options.digest, function(err, hash){
      if(err)
        return done(err);
      hash = hash.toString('hex');
      options =  {
        iterations: options.iterations,
        keylen: options.keylen,
        digest: options.digest
      };
      done(null, JSON.stringify({salt: salt, hash:hash, options: options}));
    });
  };
  if(salt === null || salt === undefined)
    crypto.randomBytes(options.saltlen, function(err, salt){
      if(err)
        return done(err);
      salt = salt.toString('hex');
      pbkdf2(salt);
    });
  else
    pbkdf2(salt);
};

var normalizeUsername = function(username){
  return username !== undefined ? username.toLowerCase().trim() : undefined;
};

/**
 * Model
 */
var Version = {
  type: Sequelize.INTEGER,
  defaultValue: 0
};
var Account = sequelize.define('Account', {
  name: Sequelize.STRING,
  balance: {
    type: Sequelize.BIGINT,
    get: function(){
      return convertAmountToFloat(this.getDataValue("balance"));
    }
  },
  currency: Sequelize.STRING,
  includeInTotal: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  },
  showInList: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  },
  version: Version
}, {
  timestamps: false
});

var FinanceTransaction = sequelize.define('FinanceTransaction', {
  type: Sequelize.ENUM("expenseincome", "transfer"),
  description: Sequelize.STRING,
  tags: {
    type: Sequelize.STRING,
    get: function() {
      if(this.getDataValue("tags") === undefined || this.getDataValue("tags") === null)
        return [];
      return JSON.parse(this.getDataValue("tags")).filter(function(tag){
        return tag !== undefined && tag.length > 0;
      });
    },
    set: function(value) {
      if(!Array.isArray(value))
        throw new Error("Tags must be an array");
      this.setDataValue("tags", JSON.stringify(value.filter(function(tag){
        return tag !== undefined && tag.length > 0;
      }).sort()));
    }
  },
  date:{
    type: Sequelize.DATEONLY,
    defaultValue: new Date().toJSON().split('T')[0]
  },
  version: Version
}, {
  timestamps: false
});

var FinanceTransactionComponent = sequelize.define('FinanceTransactionComponent', {
  amount: {
    type: Sequelize.BIGINT,
    get: function(){
      return convertAmountToFloat(this.getDataValue("amount"));
    },
    set: function(val){
      this.setDataValue("amount", convertAmountToFixed(val));
    }
  },
  version: Version
}, {
  timestamps: false,
  instanceMethods: {
    getRawAmount: function(){
      return parseInt(this.getDataValue('amount'), 10);
    }
  }
});

var User = sequelize.define('User', {
  username: {
    type: Sequelize.STRING,
    unique: true,
    get: function(){
      return normalizeUsername(this.getDataValue('username'));
    },
    set: function(value){
      this.setDataValue('username', normalizeUsername(value));
    }
  },
  password: Sequelize.TEXT,
  version: Version
}, {
  timestamps: false,
  instanceMethods: {
    validatePassword: function(password, done){
      var storedUserPassword = JSON.parse(this.getDataValue('password'));
      hashPassword(password, storedUserPassword.salt, storedUserPassword.options, function(err, result){
        if(err)
          return done(err);
        done(null, JSON.parse(result).hash === storedUserPassword.hash);
      });
    }
  }
});

var WorkerTask = sequelize.define('WorkerTask', {
  name: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  lastRun: Sequelize.DATE
}, {
  timestamps: false
});

/**
 * Associations
 */
FinanceTransactionComponent.belongsTo(FinanceTransaction);
FinanceTransactionComponent.belongsTo(Account);
FinanceTransaction.hasMany(FinanceTransactionComponent, {onDelete: 'cascade', hooks:true});
FinanceTransaction.belongsTo(User);
User.hasMany(FinanceTransaction, {onDelete: 'cascade', hooks:true});
User.hasMany(Account, {onDelete: 'cascade', hooks:true});
Account.hasMany(FinanceTransactionComponent, {onDelete: 'cascade', hooks:true});
Account.belongsTo(User);

/**
 * Hooks
 */
//TODO: set default values or do validation for all fields
Account.hook('beforeCreate', function(account, options){
  account.balance = 0;
});

FinanceTransactionComponent.hook('afterUpdate', function(financeTransactionComponent, options){
  var previousAccount = financeTransactionComponent.previous("AccountId");
  var newAccount = financeTransactionComponent.AccountId;
  var previousAmount = financeTransactionComponent.previous("amount");
  var newAmount = financeTransactionComponent.getDataValue("amount");

  if(financeTransactionComponent.AccountId === undefined && previousAccount === undefined)
    return;

  if(!financeTransactionComponent.changed("AccountId") && !financeTransactionComponent.changed("amount"))
    return;

  if(options === undefined || options.transaction === undefined)
    throw new Error(i18n.__("FinanceTransactionComponent afterUpdate hook can only be run from a transaction"));
  var transaction = options.transaction;

  var updatePreviousAccount = function(){
    if(previousAccount === undefined || previousAccount === null)
      return sequelize.Promise.resolve();
    if(!financeTransactionComponent.changed("AccountId"))
      return sequelize.Promise.resolve();
    return Account.findById(previousAccount, {transaction: transaction}).then(function(account){
      return account.decrement("balance", {by: previousAmount, transaction: transaction});
    });
  };
  var updateNewAccount = function(){
    if(newAccount === undefined || newAccount === null)
      return sequelize.Promise.resolve();
    var incrementAmount = newAmount;
    if(!financeTransactionComponent.changed("AccountId") && financeTransactionComponent.changed("amount"))
      incrementAmount = newAmount - previousAmount;
    return Account.findById(newAccount, {transaction: transaction}).then(function(account){
      return account.increment("balance", {by: incrementAmount, transaction: transaction});
    });
  };
  return updatePreviousAccount().then(updateNewAccount);
});

FinanceTransactionComponent.hook('afterDestroy', function(financeTransactionComponent, options){
  if(financeTransactionComponent.AccountId === undefined || financeTransactionComponent.AccountId === null)
    return;

  if(options === undefined || options.transaction === undefined)
    throw new Error(i18n.__("FinanceTransactionComponent afterDestroy hook can only be run from a transaction"));

  var transaction = options.transaction;
  return Account.findById(financeTransactionComponent.AccountId, {transaction: transaction}).then(function(account){
    return account.decrement("balance", {by: financeTransactionComponent.getDataValue("amount"), transaction: transaction});
  });
});

var userPasswordHashingHook = function(user, options, done){
  if (!user.changed('password'))
    return done();
  hashPassword(user.getDataValue('password'), null, null, function(err, result){
    if(err)
      return done(err);
    user.setDataValue('password', result);
    done();
  });
};
User.hook('beforeCreate', userPasswordHashingHook);
User.hook('beforeUpdate', userPasswordHashingHook);

var conflictResolutionHook = function(instance, options){
  if(options === undefined || options.transaction === undefined)
    throw new Error(i18n.__("conflictResolutionHook hook can only be run from a transaction"));
  var transaction = options.transaction;
  return instance.Model.findOne({where: {id: instance.id}, transaction: transaction}).then(function(dbInstance){
    if(dbInstance.version !== instance.version){
      throw new Error(i18n.__("Data was already updated from another session"));
    } else if(!instance.changed('version')){
      instance.version++;
      return dbInstance.increment('version', {transaction: transaction});
    }
  });
};
Account.hook('beforeUpdate', conflictResolutionHook);
FinanceTransaction.hook('beforeUpdate', conflictResolutionHook);
FinanceTransactionComponent.hook('beforeUpdate', conflictResolutionHook);
User.hook('beforeUpdate', conflictResolutionHook);

//TODO: move reusable components from controller/routes here and add tests

/**
 * Helper tools
 */
var importData = function(user, data, options){
  var accountRemappings = {};
  var createdAccounts = undefined;
  var createdFinanceTransactions = undefined;

  if(options === undefined || options.transaction === undefined)
    return sequelize.Promise.reject(new Error(i18n.__("Import can only be run from a transaction")));
  if(user === undefined)
    return sequelize.Promise.reject(new Error(i18n.__("Cannot import data for unknown user")));
  var transaction = options.transaction;

  //Java version workarounds
  if(data.accounts !== undefined){
    data.Accounts = data.accounts;
    delete data.accounts;
  }
  if(data.transactions !== undefined){
    data.FinanceTransactions = data.transactions.map(function(financeTransaction){
      financeTransaction.FinanceTransactionComponents = financeTransaction.components.map(function(financeTransactionComponent){
        financeTransactionComponent.AccountId = financeTransactionComponent.accountId;
        delete financeTransactionComponent.accountId;
        return financeTransactionComponent;
      });
      delete financeTransaction.components;
      return financeTransaction;
    });
    delete data.transactions;
  }

  //Preprocess data
  data.Accounts = data.Accounts.map(function(account, i){
      accountRemappings[account.id] = i;
      delete account.id;
      return account;
  });
  data.FinanceTransactions = data.FinanceTransactions.map(function(financeTransaction){
    delete financeTransaction.id;
    financeTransaction.type = financeTransaction.type.toLowerCase();
    financeTransaction.FinanceTransactionComponents = financeTransaction.FinanceTransactionComponents.map(function(financeTransactionComponent){
      delete financeTransactionComponent.id;
      return financeTransactionComponent;
    });
    return financeTransaction;
  });

  return Promise.all(data.Accounts.map(function(account){
    return Account.create(account, {transaction: transaction});
  })).then(function(accounts){
    createdAccounts = accounts;
    return user.addAccounts(accounts, {transaction: transaction});
  }).then(function(){
    return Promise.all(data.FinanceTransactions.map(function(financeTransaction, i){
      financeTransaction.TransactionComponents = financeTransaction.FinanceTransactionComponents.map(function(financeTransactionComponent, j){
        var accountId = financeTransactionComponent.AccountId;
        delete financeTransactionComponent.AccountId;
        financeTransactionComponent.getAccount = function(){
          return createdAccounts[accountRemappings[accountId]];
        };
        return financeTransactionComponent;
      });
      return FinanceTransaction.create(financeTransaction, {include: [FinanceTransactionComponent], transaction: transaction});
    }));
  }).then(function(financeTransactions){
    createdFinanceTransactions = financeTransactions;
    return user.addFinanceTransactions(financeTransactions, {transaction: transaction});
  }).then(function(){
    var promises = [];
    createdFinanceTransactions.forEach(function(financeTransaction, i){
      createdFinanceTransactions[i].FinanceTransactionComponents.forEach(function(financeTransactionComponent, j){
        var account = data.FinanceTransactions[i].FinanceTransactionComponents[j].getAccount();
        promises.push(financeTransactionComponent.setAccount(account, {transaction: transaction}));
      });
    });
    return Promise.all(promises);
  });
};

var exportData = function(user){
  if(user === undefined)
    return sequelize.Promise.reject(new Error(i18n.__("Cannot export data for unknown user")));
  return sequelize.transaction(function(transaction){
    return User.findOne({
      where: {id: user.id},
      include: [
        {model: Account, attributes: {exclude: ['UserId', 'version']}},
        {model: FinanceTransaction, attributes: {exclude: ['UserId', 'id', 'version']}, include: [
          {model: FinanceTransactionComponent, attributes: {exclude: ['FinanceTransactionId', 'UserId', 'id', 'version']}}
        ]
      }],
      order: [
        [Account, "id", "ASC"],
        [FinanceTransaction, "id", "ASC"],
        [FinanceTransaction, FinanceTransactionComponent, "id", "ASC"]
      ],
      attributes: {exclude: ['id', 'version', 'password']},
      transaction: transaction
    });
  }).then(function(user){
    user = user.toJSON();
    var accountRemappings = {};
    user.Accounts = user.Accounts.map(function(account, i){
      var newAccountId = i+1;
      accountRemappings[account.id] = newAccountId;
      account.id = newAccountId;
      return account;
    });
    user.FinanceTransactions.forEach(function(financeTransaction){
      financeTransaction.FinanceTransactionComponents.forEach(function(financeTransactionComponent){
        financeTransactionComponent.AccountId = accountRemappings[financeTransactionComponent.AccountId];
      });
    });
    return user;
  });
};

var performMaintenance = function(){
  var deleteOrphans = function(){
    return sequelize.transaction(function(transaction){
      return Account.findAll({where: {UserId: null}, transaction: transaction}).then(function(orphanedAccounts){
        return sequelize.Promise.all(orphanedAccounts.map(function(orphanedAccount){
          return orphanedAccount.destroy({transaction: transaction});
        }));
      }).then(function(){
        return FinanceTransaction.findAll({where: {UserId: null}, transaction: transaction}).then(function(orphanedFinanceTransactions){
          return sequelize.Promise.all(orphanedFinanceTransactions.map(function(orphanedFinanceTransaction){
            return orphanedFinanceTransaction.destroy({transaction: transaction});
          }));
        });
      }).then(function(){
        return FinanceTransactionComponent.findAll({where: {FinanceTransactionId: null}, transaction: transaction}).then(function(orphanedFinanceTransactionComponents){
          return sequelize.Promise.all(orphanedFinanceTransactionComponents.map(function(orphanedFinanceTransactionComponent){
            return orphanedFinanceTransactionComponent.destroy({transaction: transaction});
          }));
        });
      });
    });
  };
  var recalculateBalance = function(){
    return sequelize.transaction(function(transaction){
      return Account.findAll({transaction: transaction}).then(function(accounts){
        return sequelize.Promise.all(accounts.map(function(account){
          return account.update({balance: 0}, {transaction: transaction}).then(function(){
            return account.getFinanceTransactionComponents().then(function(financeTransactionComponents){
              return sequelize.Promise.all(financeTransactionComponents.map(function(financeTransactionComponent){
                return account.increment("balance", {by: financeTransactionComponent.getDataValue('amount'), transaction: transaction});
              }));
            });
          });
        }));
      });
    });
  }
  return deleteOrphans().then(recalculateBalance);
}

exports.sequelize = sequelize;
exports.importData = importData;
exports.exportData = exportData;
exports.performMaintenance = performMaintenance;

exports.convertAmountToFixed = convertAmountToFixed;
exports.convertAmountToFloat = convertAmountToFloat;
exports.normalizeUsername = normalizeUsername;

exports.User = User;
exports.FinanceTransaction = FinanceTransaction;
exports.FinanceTransactionComponent = FinanceTransactionComponent;
exports.Account = Account;
exports.WorkerTask = WorkerTask;
