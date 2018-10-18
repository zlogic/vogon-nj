var Sequelize = require('sequelize');
var path = require('path');
var os = require('os');
var crypto = require('crypto');
var util = require('util');
var logger = require('./logger');

var fixedPointMultiplier = 100.0;
var convertAmountToFloat = function (amount){
  return amount / fixedPointMultiplier;
};
var convertAmountToFixed = function (amount){
  return (amount * fixedPointMultiplier).toFixed();
};

var normalizeUsername = function(username){
  return username !== undefined ? username.toLowerCase().trim() : undefined;
};

var sequelizeConfigurer = function(databaseUrl, sequelizeOptions){
  var sequelize;
  if(databaseUrl && sequelizeOptions)
    sequelize = new Sequelize(databaseUrl, sequelizeOptions);
  else if(process.env.DATABASE_URL !== undefined)
    sequelize = new Sequelize(process.env.DATABASE_URL, {isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.sequelizeLogger, operatorsAliases: false});
  else
    sequelize = new Sequelize("sqlite:", {storage: path.resolve(os.tmpdir(), "vogon-nj.sqlite"), isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, logging: logger.sequelizeLogger, operatorsAliases: false});

  var cryptopbkdf2 = util.promisify(crypto.pbkdf2);
  var cryptoRandomBytes = util.promisify(crypto.randomBytes);

  var hashPassword = async function(password, salt, options){
    if(options === null || options === undefined)
      options = {
        iterations: 10000,
        keylen: 512,
        digest: 'sha512',
        saltlen: 256
      };
    var pbkdf2 = async function(salt){
      var hash = await cryptopbkdf2(password, salt, options.iterations, options.keylen, options.digest);
      hash = hash.toString('hex');
      options =  {
        iterations: options.iterations,
        keylen: options.keylen,
        digest: options.digest
      };
      return JSON.stringify({salt: salt, hash:hash, options: options});
    };
    if(salt === null || salt === undefined) {
      salt = await cryptoRandomBytes(options.saltlen);
      salt = salt.toString('hex');
    }
    return pbkdf2(salt);
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
    date: {
      type: Sequelize.DATE,
      defaultValue: function() {
        return new Date().toJSON().split('T')[0];
      },
      get: function() {
        if(this.getDataValue("date") === undefined || this.getDataValue("date") === null)
          return undefined;
        return new Date(this.getDataValue("date")).toJSON().split('T')[0];
      },
      set: function(value) {
        value = new Date(value);
        value = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
        this.setDataValue("date", value);
      }
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
    timestamps: false
  });
  FinanceTransactionComponent.prototype.getRawAmount = function(){
    return parseInt(this.getDataValue('amount'), 10);
  };

  var User = sequelize.define('User', {
    username: {
      type: Sequelize.STRING,
      unique: true,
      get: function(){
        return normalizeUsername(this.getDataValue('username'));
      },
      set: function(value){
        this.setDataValue('username', normalizeUsername(value));
      },
      validate: { notEmpty: true }
    },
    password: {
      type: Sequelize.TEXT,
      validate: { notEmpty: true }
    },
    version: Version
  }, {
    timestamps: false,
  });
  User.prototype.validatePassword = async function(password){
    var instance = this;
    if(instance.getDataValue('password') === undefined || instance.getDataValue('password') === null)
     return Promise.reject(new Error("Password is not set"));
    var storedUserPassword = JSON.parse(instance.getDataValue('password'));
    var hashedPassword = await hashPassword(password, storedUserPassword.salt, storedUserPassword.options)
    return JSON.parse(hashedPassword).hash === storedUserPassword.hash;
  };

  var Token = sequelize.define('Token', {
    id: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    expires: {
      type: Sequelize.DATE
    }
  }, {
    timestamps: false
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
  User.hasMany(Token, {onDelete: 'cascade'});
  Account.hasMany(FinanceTransactionComponent, {onDelete: 'cascade', hooks:true});
  Account.belongsTo(User);
  Token.belongsTo(User);

  /**
   * Hooks
   */
  //TODO: set default values or do validation for all fields
  Account.addHook('beforeCreate', async function(account, options){
    account.balance = 0;
  });

  FinanceTransactionComponent.addHook('afterUpdate', async function(financeTransactionComponent, options){
    var previousAccount = financeTransactionComponent.previous("AccountId");
    var newAccount = financeTransactionComponent.AccountId;
    var previousAmount = parseInt(financeTransactionComponent.previous("amount"), 10);
    var newAmount = parseInt(financeTransactionComponent.getDataValue("amount"), 10);

    if(financeTransactionComponent.AccountId === undefined && previousAccount === undefined)
      return;

    if(!financeTransactionComponent.changed("AccountId") && !financeTransactionComponent.changed("amount"))
      return;

    if(options === undefined || options.transaction === undefined)
      throw new Error("FinanceTransactionComponent afterUpdate hook can only be run from a transaction");
    var transaction = options.transaction;

    //Update previous account
    if(previousAccount !== undefined && previousAccount !== null && financeTransactionComponent.changed("AccountId")) {
      var account = await Account.findByPk(previousAccount, {transaction: transaction})
      await account.increment("balance", {by: -previousAmount, transaction: transaction});
    }
    //Update new account
    if(newAccount === undefined || newAccount === null)
      return;
    var incrementAmount = newAmount;
    if(!financeTransactionComponent.changed("AccountId") && financeTransactionComponent.changed("amount"))
      incrementAmount = newAmount - previousAmount;
    var account = await Account.findByPk(newAccount, {transaction: transaction})
    await account.increment("balance", {by: incrementAmount, transaction: transaction});
  });

  FinanceTransactionComponent.addHook('afterDestroy', async function(financeTransactionComponent, options){
    if(financeTransactionComponent.AccountId === undefined || financeTransactionComponent.AccountId === null)
      return;

    if(options === undefined || options.transaction === undefined)
      throw new Error("FinanceTransactionComponent afterDestroy hook can only be run from a transaction");

    var transaction = options.transaction;
    var account = await Account.findByPk(financeTransactionComponent.AccountId, {transaction: transaction});
    await account.increment("balance", {by: -parseInt(financeTransactionComponent.getDataValue("amount"), 10), transaction: transaction});
  });

  var userPasswordHashingHook = async function(user, options) {
    if (!user.changed('password'))
      return;
    
    var hashedPassword = await hashPassword(user.getDataValue('password'), null, null);
    user.setDataValue('password', hashedPassword);
    return null;
  };
  User.addHook('beforeCreate', userPasswordHashingHook);
  User.addHook('beforeUpdate', userPasswordHashingHook);

  var conflictResolutionHook = async function(instance, options){
    if(options === undefined || options.transaction === undefined)
      throw new Error("conflictResolutionHook hook can only be run from a transaction");
    var transaction = options.transaction;
    var dbInstance = await instance.constructor.findOne({where: {id: instance.id}, transaction: transaction});
    if(dbInstance.version !== instance.version){
      throw new Error("Data was already updated from another session");
    } else if(!instance.changed('version')){
      instance.version++;
      return dbInstance.increment('version', {transaction: transaction});
    }
  };
  Account.addHook('beforeUpdate', conflictResolutionHook);
  FinanceTransaction.addHook('beforeUpdate', conflictResolutionHook);
  FinanceTransactionComponent.addHook('beforeUpdate', conflictResolutionHook);
  User.addHook('beforeUpdate', conflictResolutionHook);

  //TODO: move reusable components from controller/routes here and add tests

  /**
   * Helper tools
   */
  var importData = async function(user, data, options){
    var accountRemappings = {};
    var createdAccounts = undefined;
    var createdFinanceTransactions = undefined;

    if(options === undefined || options.transaction === undefined)
      throw new Error("Import can only be run from a transaction");
    if(user === undefined)
      throw new Error("Cannot import data for unknown user");
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

    var createdAccounts = await Promise.all(data.Accounts.map(function(account){
      return Account.create(account, {transaction: transaction});
    }));
    await user.addAccounts(createdAccounts, {transaction: transaction});
    var financeTransactions = await Promise.all(data.FinanceTransactions.map(function(financeTransaction, i){
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
    createdFinanceTransactions = financeTransactions;
    await user.addFinanceTransactions(financeTransactions, {transaction: transaction});

    var promises = [];
    createdFinanceTransactions.forEach(function(financeTransaction, i){
      createdFinanceTransactions[i].FinanceTransactionComponents.forEach(function(financeTransactionComponent, j){
        var account = data.FinanceTransactions[i].FinanceTransactionComponents[j].getAccount();
        promises.push(financeTransactionComponent.setAccount(account, {transaction: transaction}));
      });
    });
    return Promise.all(promises);
  };

  var exportData = async function(user){
    if(user === undefined)
      throw new Error("Cannot export data for unknown user");
    return sequelize.transaction(async function(transaction){
      var userId = user.id;
      user = await User.findOne({
        where: {id: userId},
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
      user = user.toJSON();
      delete user.username;
      delete user.version;
      user.accounts = user.Accounts;
      delete user.Accounts;
      user.transactions = user.FinanceTransactions;
      delete user.FinanceTransactions;
      var accountRemappings = {};
      user.accounts = user.accounts.map(function(account, i){
        delete account.version;
        var newAccountId = i+1;
        accountRemappings[account.id] = newAccountId;
        account.id = newAccountId;
        return account;
      });
      user.transactions.forEach(function(financeTransaction){
        delete financeTransaction.version;
        financeTransaction.components = financeTransaction.FinanceTransactionComponents;
        financeTransaction.type = financeTransaction.type.toUpperCase();
        delete financeTransaction.FinanceTransactionComponents;
        financeTransaction.components.forEach(function(financeTransactionComponent){
          delete financeTransactionComponent.version;
          financeTransactionComponent.accountId = accountRemappings[financeTransactionComponent.AccountId];
          delete financeTransactionComponent.AccountId;
        });
      });
      return user;
    });
  };

  var performMaintenance = async function(){
    //Delete orphans
    await sequelize.transaction(async function(transaction){
      var orphanedAccounts = await Account.findAll({where: {UserId: null}, transaction: transaction});
      await Promise.all(orphanedAccounts.map(function(orphanedAccount){
        return orphanedAccount.destroy({transaction: transaction});
      }));

      var orphanedFinanceTransactions = await FinanceTransaction.findAll({where: {UserId: null}, transaction: transaction});
      await Promise.all(orphanedFinanceTransactions.map(function(orphanedFinanceTransaction){
        return orphanedFinanceTransaction.destroy({transaction: transaction});
      }));

      var orphanedFinanceTransactionComponents = await FinanceTransactionComponent.findAll({where: {FinanceTransactionId: null}, transaction: transaction});
      await Promise.all(orphanedFinanceTransactionComponents.map(function(orphanedFinanceTransactionComponent){
        return orphanedFinanceTransactionComponent.destroy({transaction: transaction});
      }));
    });
    //Recalculate balance
    await sequelize.transaction(async function(transaction){
      var accounts = await Account.findAll({transaction: transaction});
      await Promise.all(accounts.map(async function(account){
        await account.update({balance: 0}, {transaction: transaction});
        var financeTransactionComponents = await account.getFinanceTransactionComponents();
        await Promise.all(financeTransactionComponents.map(function(financeTransactionComponent){
          return account.increment("balance", {by: financeTransactionComponent.getDataValue('amount'), transaction: transaction});
        }));
      }));
    });
  };

  var deleteExpiredTokens = function(){
    return sequelize.transaction(function(transaction){
      return Token.destroy({where: {expires: {[Sequelize.Op.lte]: new Date()}}, transaction:transaction});
    });
  };

  return {
    sequelize: sequelize,
    importData: importData,
    exportData: exportData,
    performMaintenance: performMaintenance,
    deleteExpiredTokens: deleteExpiredTokens,

    convertAmountToFixed: convertAmountToFixed,
    convertAmountToFloat: convertAmountToFloat,
    normalizeUsername: normalizeUsername,

    User: User,
    FinanceTransaction: FinanceTransaction,
    FinanceTransactionComponent: FinanceTransactionComponent,
    Account: Account,
    WorkerTask: WorkerTask,
    Token: Token
  };
};

exports.model = sequelizeConfigurer;
