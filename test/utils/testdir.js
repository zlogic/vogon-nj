var fs = require('fs');
var path = require('path');

var tmpdir = path.join('test', 'tmp');
var testsLog = path.join('test', 'tmp', 'tests.log');

var prepareTestsDir = function(){
  try { fs.mkdirSync(tmpdir); }
  catch (err) { }
  try { fs.unlinkSync(testsLog); }
  catch (err) { }
};

prepareTestsDir();

module.exports.tmpdir = tmpdir;
