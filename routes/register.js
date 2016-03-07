var express = require('express');
var router = express.Router();
var dbService = require('../services/model');
var auth = require('../services/auth');
var i18n = require('i18n');
var logger = require('../services/logger').logger;

/* Register. */
router.post('/', function (req, res, next) {
  var user = req.body;
  if(auth.allowRegistration()){
    dbService.User.findOrCreate({where: {username: dbService.normalizeUsername(user.username)}, defaults: user}).spread(function(user, created){
      if(created){
        user = user.toJSON();
        delete user.password;
        delete user.id;
        delete user.version;
        res.send(user);
      } else {
        res.status(500);
        res.send({exception: i18n.__('User already exists')});
      }
    }).catch(function(err){
      logger.error(err);
      res.status(500);
      res.send({exception: i18n.__('Cannot register user because of error: %s', err.name)});
    });
  } else {
    res.status(500);
    res.send({exception: i18n.__('Registration is not allowed')});
  };
});

module.exports = router;
