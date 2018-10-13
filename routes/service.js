var express = require('express');
var Sequelize = require('sequelize');
var dbService = require('../services/dbservice');
var analyticsService = require('../services/analytics');
var passport = require('passport');
var multer = require('multer');
var logger = require('../services/logger');
var router = express.Router();

/* Authentication */
router.use(passport.authenticate('bearer', { session: false }));

/* Uploads */
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

/* GET accounts. */
router.get('/accounts', async function(req, res, next) {
  try {
    var response = await dbService.sequelize.transaction(async function(transaction){
      return dbService.Account.findAll({where: {UserId: req.user.id}, attributes: {exclude: 'UserId'}, transaction: transaction});
    });
    res.send(response);
  } catch(err) {
    next(err);
  }
});

/* POST accounts. */
router.post('/accounts', async function(req, res, next) {
  var reqAccounts = req.body;
  var reqAccountsIds = {};
  reqAccounts.forEach(function(account){
    return reqAccountsIds[account.id] = account;
  });
  try {
    var response = await dbService.sequelize.transaction(async function(transaction){
      var dbAccounts = await dbService.Account.findAll({where: {UserId: req.user.id}, transaction: transaction});
      var existingAccountIds = {};
      dbAccounts.forEach(function(account){
        existingAccountIds[account.id] = account;
      });
      var newAccounts = reqAccounts.filter(function(account){
        return existingAccountIds[account.id] === undefined;
      }).map(function(account){
        delete account.id;
        delete account.UserId;
        return account;
      });
      var deletedAccounts = dbAccounts.filter(function(account){
        return reqAccountsIds[account.id] === undefined;
      });
      var updatedAccounts = reqAccounts.filter(function(account){
        return existingAccountIds[account.id] !== undefined;
      }).map(function(account){
        delete account.balance;
        delete account.UserId;
        return account;
      });
      await Promise.all(
        deletedAccounts.map(function(account){
          return account.destroy({transaction: transaction});
        })
      );
      await Promise.all(newAccounts.map(async function(account){
        var newAccount = await dbService.Account.create(account, {transaction: transaction});
        return newAccount.setUser(req.user, {transaction: transaction});
      }));
      await Promise.all(updatedAccounts.map(function(account){
        return existingAccountIds[account.id].update(account, {transaction: transaction});
      }));
      var accounts = await dbService.Account.findAll({where: {UserId: req.user.id}, attributes: {exclude: 'UserId'}, transaction: transaction});
      return accounts.map(function(account){
        return account.toJSON();
      });
    });
    res.send(response);
  } catch(err) {
    next(err);
  }
});

/* GET transactions. */
router.get('/transactions', async function(req, res, next) {
  var pageSize = 100;
  var page = req.query.page;
  var sortColumn = req.query.sortColumn || 'date';
  var sortDirection = req.query.sortDirection || 'DESC';
  var filterDescription = req.query.filterDescription;
  var filterDate = req.query.filterDate;
  var filterTags = req.query.filterTags;
  page = page || 0;
  var offset = page * pageSize;
  var sortOrder = [
    [sortColumn, sortDirection],
    ['id', sortDirection],
    [dbService.FinanceTransactionComponent, 'id', sortDirection]
  ];
  var where = [{UserId: req.user.id}];
  if(filterDescription !== undefined && filterDescription.length > 0)
    where.push(dbService.sequelize.where(dbService.sequelize.fn('lower', dbService.sequelize.col('description')), 'LIKE', filterDescription.toLowerCase()));
  if(filterDate !== undefined && filterDate.length > 0)
    where.push({date: new Date(filterDate)});
  if(filterTags !== undefined && filterTags.length > 0)
    filterTags = JSON.parse(filterTags);
  if(filterTags !== undefined && filterTags.length > 0)
    where.push({[Sequelize.Op.or]: filterTags.map(function(tag){
        return [
          {tags: {[Sequelize.Op.like]: '[' + JSON.stringify(tag) + '%'}},
          {tags: {[Sequelize.Op.like]: '%,' + JSON.stringify(tag) + ',%'}},
          {tags: {[Sequelize.Op.like]: '%,' + JSON.stringify(tag) + ']'}}
        ]
      }).reduce(function(a, b) {return a.concat(b);},[])
    });
  try{
    var response = await dbService.sequelize.transaction(async function(transaction){
      var financeTransactions = await dbService.FinanceTransaction.findAll({
        where: {[Sequelize.Op.and]: where},
        include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['UserId', 'FinanceTransactionId']}}],
        attributes: {exclude: 'UserId'},
        transaction: transaction,
        order: sortOrder,
        offset: offset, limit: pageSize
      })
      return financeTransactions.map(function(financeTransaction){
        //console.log(financeTransaction.toJSON());
        return financeTransaction;
      });
    })
    res.send(response);
  } catch(err) {
    next(err);
  }
});

/* GET transaction. */
router.get('/transactions/transaction/:id', async function(req, res, next) {
  try {
    var response = await dbService.sequelize.transaction(async function(transaction){
      var financeTransaction = await dbService.FinanceTransaction.findOne({
        where: {id: req.params.id, UserId: req.user.id},
        attributes: {exclude: 'UserId'},
        transaction: transaction,
        include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['UserId', 'FinanceTransactionId']}}]
      })
      if(financeTransaction !== null)
        return financeTransaction.toJSON();
      throw new Error("Transaction does not exist");
    });
    res.send(response);
  } catch(err) {
    next(err);
  }
});

/* POST transactions. */
router.post('/transactions', async function(req, res, next) {
  var reqFinanceTransaction = req.body;
  var reqFinanceTransactionComponents = reqFinanceTransaction.FinanceTransactionComponents || [];
  delete reqFinanceTransaction.FinanceTransactionComponents;
  delete reqFinanceTransaction.UserId;
  var reqFinanceTransactionComponentIds = {};
  reqFinanceTransactionComponents.forEach(function(financeTransactionComponent){
    delete financeTransactionComponent.UserId;
    reqFinanceTransactionComponentIds[financeTransactionComponent.id] = financeTransactionComponent;
  });
  var dbFinanceTransaction = undefined;
  var dbFinanceTransactionComponents = undefined;
  var validateAccount = function(){};
  try {
    var response = await dbService.sequelize.transaction(async function(transaction){
      var accounts = await dbService.Account.findAll({where: {UserId: req.user.id}, transaction: transaction});
      validateAccount = function(financeTransactionComponent){
        if(accounts.some(function(account){return financeTransactionComponent.AccountId === account.id;}))
          return financeTransactionComponent;
        logger.logger.error("Invalid account id: %s", financeTransactionComponent.AccountId);
        throw new Error('Cannot set an invalid account id');
      };
      var financeTransaction = await dbService.FinanceTransaction.findOne({where: {UserId: req.user.id, id: reqFinanceTransaction.id}, include: [dbService.FinanceTransactionComponent], transaction: transaction});
      if(financeTransaction == null){
        var createdTransaction = await dbService.FinanceTransaction.create(reqFinanceTransaction, {transaction: transaction});
        dbFinanceTransaction = createdTransaction;
        dbFinanceTransactionComponents = [];
        await createdTransaction.setUser(req.user, {transaction: transaction});
      } else {
        dbFinanceTransaction = financeTransaction;
        dbFinanceTransactionComponents = financeTransaction.FinanceTransactionComponents;
        await dbFinanceTransaction.update(reqFinanceTransaction, {transaction: transaction});
      }
      var existingFinanceTransactionComponentIds = {};
      dbFinanceTransactionComponents.forEach(function(financeTransactionComponent){
        existingFinanceTransactionComponentIds[financeTransactionComponent.id] = financeTransactionComponent;
      });
      var newFinanceTransactionComponents = reqFinanceTransactionComponents.filter(function(financeTransactionComponent){
        return existingFinanceTransactionComponentIds[financeTransactionComponent.id] === undefined;
      }).map(function(financeTransactionComponent){
        delete financeTransactionComponent.id;
        return financeTransactionComponent;
      });
      var deletedFinanceTransactionComponents = dbFinanceTransactionComponents.filter(function(financeTransactionComponent){
        return reqFinanceTransactionComponentIds[financeTransactionComponent.id] === undefined;
      });
      var updatedFinanceTransactionComponents = reqFinanceTransactionComponents.filter(function(financeTransactionComponent){
        return existingFinanceTransactionComponentIds[financeTransactionComponent.id] !== undefined;
      });
      await Promise.all(
        deletedFinanceTransactionComponents.map(function(financeTransactionComponent){
          return financeTransactionComponent.destroy({transaction: transaction});
        })
      );
      await Promise.all(newFinanceTransactionComponents.map(async function(financeTransactionComponent){
        var accountId = financeTransactionComponent.AccountId;
        delete financeTransactionComponent.AccountId;
        var financeTransactionComponent = await dbService.FinanceTransactionComponent.create(financeTransactionComponent, {transaction: transaction})
        await financeTransactionComponent.setFinanceTransaction(dbFinanceTransaction, {transaction: transaction});
        var account = await dbService.Account.findOne({where: {UserId: req.user.id, id: accountId}, transaction: transaction});
        await financeTransactionComponent.setAccount(account, {transaction: transaction});
      }));
      await Promise.all(updatedFinanceTransactionComponents.map(function(financeTransactionComponent){
        financeTransactionComponent = validateAccount(financeTransactionComponent);
        return existingFinanceTransactionComponentIds[financeTransactionComponent.id].update(financeTransactionComponent, {transaction: transaction});
      }));
      financeTransaction = await dbFinanceTransaction.reload({transaction: transaction, include: [dbService.FinanceTransactionComponent]});
      financeTransaction = financeTransaction.toJSON();
      delete financeTransaction.UserId;
      if(financeTransaction.FinanceTransactionComponents !== undefined)
        financeTransaction.FinanceTransactionComponents.forEach(function(financeTransactionComponent){
          delete financeTransactionComponent.FinanceTransactionId;
        });
      return financeTransaction;
    });
    res.send(response);
  } catch(err) {
    next(err);
  }
});

/* DELETE transaction. */
router.delete('/transactions/transaction/:id', async function(req, res, next) {
  try {
    var response = await dbService.sequelize.transaction(async function(transaction){
      var financeTransaction = await dbService.FinanceTransaction.findOne({
        where: {UserId: req.user.id, id: req.params.id},
        include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['UserId', 'FinanceTransactionId']}}],
        attributes: {exclude: ['UserId']},
        transaction: transaction});
      if(financeTransaction !== null)
        return financeTransaction.destroy({transaction: transaction}).then(function(){
          return financeTransaction.toJSON();
        });
      throw new Error("Cannot delete non-existing transaction");
    });
    res.send(response);
  } catch(err) {
    next(err);
  }
});

/* GET user. */
router.get('/user', function(req, res, next) {
  var user = req.user.toJSON();
  delete user.password;
  delete user.id;
  res.send(user);
});

/* POST user. */
router.post('/user', async function(req, res, next) {
  var reqUser = req.body;
  delete reqUser.id;
  try {
    var response = await dbService.sequelize.transaction(async function(transaction){
      var user = await req.user.update(reqUser, {transaction: transaction});
      user = user.toJSON();
      delete user.password;
      delete user.id;
      return user;
    });
    res.send(response);
  } catch(err) {
    next(err);
  }
});

/* GET analytics tags. */
router.get('/analytics/tags', async function(req, res, next) {
  try {
    var response = await dbService.sequelize.transaction(async function(transaction){
      var financeTransactions = await dbService.FinanceTransaction.findAll({where: {UserId: req.user.id}, attributes: ['tags'], transaction: transaction});
      var tagsSet = new Set([""]);
      financeTransactions.forEach(function(financeTransaction){
        financeTransaction.tags.forEach(function(tag){
          tagsSet = tagsSet.add(tag);
        });
      });
      var tagsArray = Array.from(tagsSet);
      tagsArray.sort();
      return tagsArray;
    });
    res.send(response);
  } catch(err) {
    next(err);
  }
});

/* POST analytics. */
router.post('/analytics', async function(req, res, next) {
  try{
    var report = await analyticsService.buildReport(req.user, req.body)
    res.send(report);
  } catch(err) {
    next(err);
  }
});

/* GET export */
router.post('/export', async function(req, res, next) {
  try {
    var exportedData = await dbService.exportData(req.user);
    res.attachment('vogon-' + new Date().toJSON() + '.json');
    res.send(JSON.stringify(exportedData, null, "\t"));
  } catch(err) {
    next(err);
  }
});

/* POST import */
router.post('/import', upload.single('file'), async function(req, res, next) {
  var data = req.file.buffer.toString();
  try {
    var response = await dbService.sequelize.transaction(async function(transaction){
      await dbService.importData(req.user, JSON.parse(data), {transaction: transaction});
      return true;
    });
    res.send(response);
  } catch(err) {
    next(err);
  }
});

/* Error handler */
router.use(function(err, req, res, next) {
  logger.logException(err);
  res.status(err.status || 500);
  res.send(err.message);
});

module.exports = router;
