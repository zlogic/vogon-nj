var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { allowRegistration: JSON.parse(process.env.ALLOW_REGISTRATION) });
});

module.exports = router;
