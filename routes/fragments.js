var express = require('express');
var path = require('path');
var auth = require('../services/auth');
var fs = require('fs');
var i18n = require('i18n');
var router = express.Router();

var existingTemplates = new Set();

/* GET fragments. */
router.get('/:fragment(\\w+)\.fragment', function(req, res, next) {
  var templateName = path.join('fragments', path.parse(req.params.fragment).name);
  var render = function(){
    res.render(templateName, { allowRegistration: auth.allowRegistration() });
  };
  if(existingTemplates.has(templateName))
    return render();
  fs.stat(path.join('views', templateName + '.jade'), function(err, stats){
    if(err || stats === undefined || !stats.isFile()){
      var error = new Error(i18n.__('Fragment not found'));
      error.status = 404;
      return next(error);
    }
    existingTemplates.add(templateName);
    render();
  });
});

module.exports = router;
