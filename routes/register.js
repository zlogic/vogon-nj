var express = require('express');
var router = express.Router();
var dbService = require('../model/service');
var auth = require('../services/auth');
var i18n = require('i18n');

/* Register. */
router.post('/', function (req, res, next) {
  var user = req.body;
  if(auth.allowRegistration()){
    dbService.User.findOrCreate({where: {username: user.username}, defaults: user}).spread(function(user, created){
      if(created){
        res.send(user);
      } else {
        res.status(500);
        res.send({exception: i18n.__('User already exists')});
      }
    }).catch(function(err){
      console.error(err);
      res.status(500);
      res.send({exception: i18n.__('Cannot register user because of error: %s', err.name)});
    });
  } else {
    res.status(500);
    res.send({exception: i18n.__('Registration is not allowed')});
  };
});

module.exports = router;
