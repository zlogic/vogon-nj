var express = require('express');
var router = express.Router();
var dbService = require('../services/dbservice');
var auth = require('../services/auth');
var logger = require('../services/logger').logger;

/* Register. */
router.post('/', async function (req, res, next) {
  var user = req.body;
  if(auth.allowRegistration()){
    try {
    var [user, created] = await dbService.User.findOrCreate({where: {username: dbService.normalizeUsername(user.username)}, defaults: user});
      if(created){
        user = user.toJSON();
        delete user.password;
        delete user.id;
        delete user.version;
        res.send(user);
      } else {
        res.status(500);
        res.send({exception: 'User already exists'});
      }
    } catch(err) {
      logger.error(err);
      res.status(500);
      res.send({exception: 'Cannot register user because of error: {0}', args:[err.name]});
    }
  } else {
    res.status(500);
    res.send({exception: 'Registration is not allowed'});
  };
});

module.exports = router;
