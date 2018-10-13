var express = require('express');
var auth = require('../services/auth');
var passport = require('passport');
var logger = require('../services/logger');
var router = express.Router();

var errorLogger = function(err, req, res, next){
  logger.logException(err);
  next(err);
}

router.post('/service',
  passport.authenticate('bearer', { session: false }),
  auth.oauth2server.token(),
  errorLogger,
  auth.oauth2server.errorHandler());

router.post('/token',
  passport.authenticate('local', { session: false }),
  auth.oauth2server.token(),
  errorLogger,
  auth.oauth2server.errorHandler());

router.post('/logout', passport.authenticate('bearer', { session: false }), async function (req, res, next) {
  try {
    await auth.logout(req.body.token)
    res.send("");
  } catch(err) {
    next(err);
  }
}, errorLogger, auth.oauth2server.errorHandler());

module.exports = router;
