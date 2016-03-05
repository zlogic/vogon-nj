var fs = require('fs');
var path = require('path');

var tmpdir = path.join('test', 'tmp');

var prepareTestsLog = function(){
  try { fs.mkdirSync(tmpdir); }
  catch (err) { }
  try { fs.unlinkSync(testsLog); }
  catch (err) { }
};

prepareTestsLog();

module.exports.tmpdir = tmpdir;
