var express = require('express');
var path = require('path');
var router = express.Router();

/* GET fragments. */
router.get('/:fragment(\\w+)\.fragment', function(req, res, next) {
  res.render(path.join('fragments', req.params.fragment), { allowRegistration: JSON.parse(process.env.ALLOW_REGISTRATION) });
});

module.exports = router;
