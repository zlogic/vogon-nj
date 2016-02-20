var express = require('express');
var path = require('path');
var auth = require('../services/auth');
var router = express.Router();

/* GET fragments. */
router.get('/:fragment(\\w+)\.fragment', function(req, res, next) {
  res.render(path.join('fragments', req.params.fragment), { allowRegistration: auth.allowRegistration() });
});

module.exports = router;
