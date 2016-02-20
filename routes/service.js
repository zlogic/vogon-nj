var express = require('express');
var auth = require('../services/auth');
var passport = require('passport');
var router = express.Router();

/* Authentication */
router.use(passport.authenticate('bearer', { session: false }));

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

module.exports = router;
