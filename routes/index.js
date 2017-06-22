var express = require('express');
var auth = require('../services/auth');
var router = express.Router();

/* GET home page. */
router.get(['/', '/login', '/transactions', '/accounts', '/analytics', '/usersettings', '/intro'], function(req, res, next) {
  res.render('index', { allowRegistration: auth.allowRegistration() });
});

module.exports = router;
