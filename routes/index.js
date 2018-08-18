var express = require('express');
var auth = require('../services/auth');
var path = require('path');
var router = express.Router();

/* GET home page. */
router.get(['/', '/login', '/transactions', '/accounts', '/analytics', '/usersettings', '/intro'], function(req, res, next) {
  res.sendFile(path.join(__dirname, '..', 'dist', 'vogon-nj', 'index.html'));
});

/*  GET configuration */
router.get('/configuration', function(req, res, next) {
  res.send({allowRegistration: auth.allowRegistration()});
});

module.exports = router;
