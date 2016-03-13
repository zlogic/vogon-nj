var express = require('express');
var auth = require('../services/auth');
var passport = require('passport');
var router = express.Router();

router.post('/service',
  passport.authenticate('bearer', { session: false }),
  auth.oauth2server.token(),
  auth.oauth2server.errorHandler());

router.post('/token',
  passport.authenticate('local', { session: false }),
  auth.oauth2server.token(),
  auth.oauth2server.errorHandler());

router.post('/logout', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  auth.logout(req.body.token).then(function(){
    res.send("");
  }).catch(next);
});

module.exports = router;
