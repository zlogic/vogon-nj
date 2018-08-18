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
router.get('/accounts', function(req, res, next) {
  dbService.sequelize.transaction(function(transaction){
    return dbService.Account.findAll({where: {UserId: req.user.id}, attributes: {exclude: 'UserId'}, transaction: transaction}).then(function(accounts){
      return accounts;
    })
  }).then(function(response){
    res.send(response);
  }).catch(next);
});

/* POST accounts. */
router.post('/accounts', function(req, res, next) {
  var reqAccounts = req.body;
  var reqAccountsIds = {};
  reqAccounts.forEach(function(account){
    return reqAccountsIds[account.id] = account;
  });
  dbService.sequelize.transaction(function(transaction){
    return dbService.Account.findAll({where: {UserId: req.user.id}, transaction: transaction}).then(function(dbAccounts){
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
      return dbService.sequelize.Promise.all(
        deletedAccounts.map(function(account){
          return account.destroy({transaction: transaction});
        })
      ).then(function(){
        return dbService.sequelize.Promise.all(newAccounts.map(function(account){
          return dbService.Account.create(account, {transaction: transaction}).then(function(newAccount){
            return newAccount.setUser(req.user, {transaction: transaction});
          });
        }));
      }).then(function(){
        return dbService.sequelize.Promise.all(updatedAccounts.map(function(account){
          return existingAccountIds[account.id].update(account, {transaction: transaction});
        }));
      }).then(function(){
        return dbService.Account.findAll({where: {UserId: req.user.id}, attributes: {exclude: 'UserId'}, transaction: transaction});
      }).then(function(accounts){
        return accounts.map(function(account){
          return account.toJSON();
        });
      });
    });
  }).then(function(response){
    res.send(response);
  }).catch(next);
});

/* GET transactions. */
router.get('/transactions', function(req, res, next) {
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
  dbService.sequelize.transaction(function(transaction){
    return dbService.FinanceTransaction.findAll({
      where: {[Sequelize.Op.and]: where},
      include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['UserId', 'FinanceTransactionId']}}],
      attributes: {exclude: 'UserId'},
      transaction: transaction,
      order: sortOrder,
      offset: offset, limit: pageSize
    }).then(function(financeTransactions){
      return financeTransactions.map(function(financeTransaction){
        //console.log(financeTransaction.toJSON());
        return financeTransaction;
      });
    })
  }).then(function(response){
    res.send(response);
  }).catch(next);
});

/* GET transaction. */
router.get('/transactions/transaction/:id', function(req, res, next) {
  dbService.sequelize.transaction(function(transaction){
    return dbService.FinanceTransaction.findOne({
      where: {id: req.params.id, UserId: req.user.id},
      attributes: {exclude: 'UserId'},
      transaction: transaction,
      include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['UserId', 'FinanceTransactionId']}}]
    }).then(function(financeTransaction){
      if(financeTransaction !== null)
        return financeTransaction.toJSON();
      throw new Error("Transaction does not exist");
    });
  }).then(function(response){
    res.send(response);
  }).catch(next);
});

/* POST transactions. */
router.post('/transactions', function(req, res, next) {
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
  dbService.sequelize.transaction(function(transaction){
    return dbService.Account.findAll({where: {UserId: req.user.id}, transaction: transaction}).then(function(accounts){
      validateAccount = function(financeTransactionComponent){
        if(accounts.some(function(account){return financeTransactionComponent.AccountId === account.id;}))
          return financeTransactionComponent;
        logger.logger.error("Invalid account id: %s", financeTransactionComponent.AccountId);
        throw new Error('Cannot set an invalid account id');
      };
    }).then(function(){
      return dbService.FinanceTransaction.findOne({where: {UserId: req.user.id, id: reqFinanceTransaction.id}, include: [dbService.FinanceTransactionComponent], transaction: transaction}).then(function(financeTransaction){
        if(financeTransaction == null){
          return dbService.FinanceTransaction.create(reqFinanceTransaction, {transaction: transaction}).then(function(createdTransaction){
            dbFinanceTransaction = createdTransaction;
            dbFinanceTransactionComponents = [];
            return createdTransaction.setUser(req.user, {transaction: transaction});
          });
        } else {
          dbFinanceTransaction = financeTransaction;
          dbFinanceTransactionComponents = financeTransaction.FinanceTransactionComponents;
          return dbFinanceTransaction.update(reqFinanceTransaction, {transaction: transaction});
        }
      });
    }).then(function(){
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
      return dbService.sequelize.Promise.all(
        deletedFinanceTransactionComponents.map(function(financeTransactionComponent){
          return financeTransactionComponent.destroy({transaction: transaction});
        })
      ).then(function(){
        return dbService.sequelize.Promise.all(newFinanceTransactionComponents.map(function(financeTransactionComponent){
          var accountId = financeTransactionComponent.AccountId;
          delete financeTransactionComponent.AccountId;
          return dbService.FinanceTransactionComponent.create(financeTransactionComponent, {transaction: transaction}).then(function(financeTransactionComponent){
            return financeTransactionComponent.setFinanceTransaction(dbFinanceTransaction, {transaction: transaction}).then(function(){
              return dbService.Account.findOne({where: {UserId: req.user.id, id: accountId}, transaction: transaction}).then(function(account){
                return financeTransactionComponent.setAccount(account, {transaction: transaction});
              });
            });
          });
        }));
      }).then(function(){
        return dbService.sequelize.Promise.all(updatedFinanceTransactionComponents.map(function(financeTransactionComponent){
          financeTransactionComponent = validateAccount(financeTransactionComponent);
          return existingFinanceTransactionComponentIds[financeTransactionComponent.id].update(financeTransactionComponent, {transaction: transaction});
        }));
      }).then(function(){
        return dbFinanceTransaction.reload({transaction: transaction, include: [dbService.FinanceTransactionComponent]});
      }).then(function(financeTransaction){
        financeTransaction = financeTransaction.toJSON();
        delete financeTransaction.UserId;
        if(financeTransaction.FinanceTransactionComponents !== undefined)
          financeTransaction.FinanceTransactionComponents.forEach(function(financeTransactionComponent){
            delete financeTransactionComponent.FinanceTransactionId;
          });
        return financeTransaction;
      });
    });
  }).then(function(response){
    res.send(response);
  }).catch(next);
});

/* DELETE transaction. */
router.delete('/transactions/transaction/:id', function(req, res, next) {
  dbService.sequelize.transaction(function(transaction){
    return dbService.FinanceTransaction.findOne({
      where: {UserId: req.user.id, id: req.params.id},
      include: [{model: dbService.FinanceTransactionComponent, attributes: {exclude: ['UserId', 'FinanceTransactionId']}}],
      attributes: {exclude: ['UserId']},
      transaction: transaction}).then(function(financeTransaction){
      if(financeTransaction !== null)
        return financeTransaction.destroy({transaction: transaction}).then(function(){
          return financeTransaction.toJSON();
        });
      throw new Error("Cannot delete non-existing transaction");
    });
  }).then(function(response){
    res.send(response);
  }).catch(next);
});

/* GET user. */
router.get('/user', function(req, res, next) {
  var user = req.user.toJSON();
  delete user.password;
  delete user.id;
  res.send(user);
});

/* POST user. */
router.post('/user', function(req, res, next) {
  var reqUser = req.body;
  delete reqUser.id;
  dbService.sequelize.transaction(function(transaction){
    return req.user.update(reqUser, {transaction: transaction}).then(function(user){
      user = user.toJSON();
      delete user.password;
      delete user.id;
      return user;
    });
  }).then(function(response){
    res.send(response);
  }).catch(next);
});

/* GET analytics tags. */
router.get('/analytics/tags', function(req, res, next) {
  dbService.sequelize.transaction(function(transaction){
    return dbService.FinanceTransaction.findAll({where: {UserId: req.user.id}, attributes: ['tags'], transaction: transaction}).then(function(financeTransactions){
      var tagsSet = new Set([""]);
      financeTransactions.forEach(function(financeTransaction){
        financeTransaction.tags.forEach(function(tag){
          tagsSet = tagsSet.add(tag);
        });
      });
      return Array.from(tagsSet);
    });
  }).then(function(response){
    res.send(response);
  }).catch(next);
});

/* POST analytics. */
router.post('/analytics', function(req, res, next) {
  analyticsService.buildReport(req.user, req.body).then(function(report){
    res.send(report);
  }).catch(next);
});

/* GET export */
router.post('/export', function(req, res, next) {
  dbService.exportData(req.user).then(function(exportedData){
    res.attachment('vogon-' + new Date().toJSON() + '.json');
    res.send(JSON.stringify(exportedData, null, "\t"));
  }).catch(next);
});

/* POST import */
router.post('/import', upload.single('file'), function(req, res, next) {
  var data = req.file.buffer.toString();
  dbService.sequelize.transaction(function(transaction){
    return dbService.importData(req.user, JSON.parse(data), {transaction: transaction}).then(function(){
      return true;
    });
  }).then(function(response){
    res.send(response);
  }).catch(next);
});

/* Error handler */
router.use(function(err, req, res, next) {
  logger.logException(err);
  res.status(err.status || 500);
  res.send(err.message);
});

module.exports = router;
