var fs = require('fs');
var path = require('path');
var testdir = require('./testdir');

var testsLog = path.join(testdir.tmpdir, 'tests.log');
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

module.exports.logFunction = logFunction;
module.exports.flush = flush;
module.exports.stream = stream;
