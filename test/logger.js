var fs = require('fs');
var path = require('path');


var tmpdir = 'logs';
var testsLog = path.join(tmpdir, 'tests.log');

var prepareTestsLog = function(){
  try { fs.mkdirSync(tmpdir); }
  catch (err) { }
  try { fs.unlinkSync(testsLog); }
  catch (err) { }
};

var collectedMessages = '';

var logFunction = function(message){
  collectedMessages += message + '\n';
};

var flush = function(callback){
  var writeMessages = collectedMessages + '\n';
  collectedMessages = '';
  fs.appendFile(testsLog, writeMessages, undefined, callback);
};

var stream = {write: logFunction};

prepareTestsLog();

module.exports.logFunction = logFunction;
module.exports.flush = flush;
module.exports.stream = stream;
