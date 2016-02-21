var express = require('express');
var dbService = require('../model/service');
var passport = require('passport');
var multer = require('multer');
var currencies = require('country-data').currencies;
var router = express.Router();

/* Authentication */
router.use(passport.authenticate('bearer', { session: false }));

/* Uploads */
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

/* GET accounts. */
router.get('/accounts', function(req, res, next) {
  dbService.Account.findAll({where: {UserUsername: req.user.username} }).then(function(accounts){
    res.send(accounts);
  });
});

/* GET transactions. */
router.get('/transactions', function(req, res, next) {
  var pageSize = 100;
  var page = req.query.page;
  var sortColumn = req.query.sortColumn;
  var sortDirection = req.query.sortDirection;
  var filterDescription = req.query.filterDescription;
  var filterDate = req.query.filterDate;
  var filterTags = req.query.filterTags;
  page = page !== undefined ? page : 0;
  var offset = page * pageSize;
  var sortOrder = [
    [sortColumn, sortDirection],
    ['id', sortDirection]
  ];
  var where = {UserUsername: req.user.username};
  if(filterDescription !== undefined && filterDescription.length > 0)
    where.description = {$like: filterDescription};
  if(filterDate !== undefined && filterDate.length > 0)
    where.date = filterDate;
  if(filterTags !== undefined && filterTags.length > 0)
    filterTags = filterTags.split(",")
  if(filterTags !== undefined && filterTags.length > 0)
    where.$or = filterTags.map(function(tag){return {tags: {$like: '%' + tag + '%'}}});
  dbService.Transaction.findAll({
    where: where,
    include: [dbService.TransactionComponent],
    order: sortOrder,
    offset: offset, limit: pageSize
  }).then(function(transactions){
    res.send(transactions.map(function(transaction){
      delete transaction.UserUsername;
      return transaction;
    }));
  });
});

/* GET transaction. */
router.get('/transactions/transaction/:id', function(req, res, next) {
  dbService.Transaction.findOne({where: {id: req.params.id, UserUsername: req.user.username}, include: [dbService.TransactionComponent]}).then(function(transaction){
    res.send(transaction.toJSON());
  });
});

/* GET user. */
router.get('/user', function(req, res, next) {
  var user = req.user.toJSON();
  delete user.password;
  res.send(user);
});

/* GET currencies. */
router.get('/currencies', function(req, res, next) {
  res.send(currencies.all.map(function(currency){
    return { currencyCode: currency.code, displayName: currency.name };
  }).sort(function(a, b){
    return a.displayName.localeCompare(b.displayName);
  }).filter(function(currency){
    //TODO: migrate to a better currency code library?
    //This excludes a really ugly currency name
    return currency.currencyCode !== "USS";
  }));
});

/* GET tags. */
router.get('/analytics/tags', function(req, res, next) {
  dbService.Transaction.findAll({where: {UserUsername: req.user.username}, attributes: ['tags']}).then(function(transactions){
    var tagsSet = new Set([""]);
    transactions.forEach(function(transaction){
      transaction.tags.forEach(function(tag){
        tagsSet = tagsSet.add(tag);
      });
    });
    res.send(Array.from(tagsSet));
  });
});

/* GET export */
router.post('/export', function(req, res, next) {
  dbService.exportData(req.user).then(function(exportedData){
    res.setHeader('Content-Disposition', 'attachment; filename=vogon-' + new Date().toJSON() + '.json');
    res.send(JSON.stringify(exportedData, null, "\t"));
  });
});

/* POST import */
router.post('/import', upload.single('file'), function(req, res, next) {
  var data = req.file.buffer.toString();
  dbService.sequelize.transaction(function(transaction){
    return dbService.importData(req.user, JSON.parse(data), {transaction: transaction}).then(function(){
      res.send(true);
    });
  });
});

module.exports = router;
