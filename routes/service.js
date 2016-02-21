var express = require('express');
var dbService = require('../model/service');
var passport = require('passport');
var multer = require('multer');
var router = express.Router();

/* Authentication */
router.use(passport.authenticate('bearer', { session: false }));

/* Uploads */
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

/* GET accounts. */
router.get('/accounts', function(req, res, next) {
  res.send([]);
});

/* GET transactions. */
router.get('/transactions', function(req, res, next) {
  res.send([]);
});

/* GET user. */
router.get('/user', function(req, res, next) {
  res.send([]);
});

/* GET currencies. */
router.get('/currencies', function(req, res, next) {
  res.send([]);
});

/* GET tags. */
router.get('/analytics/tags', function(req, res, next) {
  res.send([]);
});

/* GET export */
router.post('/export', function(req, res, next) {
  dbService.exportData(req.user).then(function(exportedData){
    res.setHeader('Content-Disposition', 'attachment; filename=vogon-' + new Date().toJSON() + '.json');
    res.send(exportedData);
  });
});

/* POST import */
router.post('/import', upload.single('file'), function(req, res, next) {
  var data = req.file.buffer.toString();
  dbService.importData(req.user, JSON.parse(data)).then(function(){
    res.send(true);
  });
});

module.exports = router;