var dbService = require('./model');
var logger = require('./logger').logger;

var plannedRun;

var rescheduleCleaner = function(){
  if(plannedRun)
    clearTimeout(plannedRun);
  delete plannedRun;

  var planNextRun = function(expires){
    expires = new Date(expires);
    var currentTime = new Date();
    var sleepMillis = expires.getTime() - currentTime.getTime();
    sleepMillis = Math.max(sleepMillis, 0);
    logger.debug("Planning expired token cleanup for " + expires.toISOString());
    plannedRun = setTimeout(function(){
      return dbService.deleteExpiredTokens().then(function(){
        rescheduleCleaner();
      });
    }, sleepMillis);
  };

  return dbService.Token.min('expires').then(function(expires){
    if(expires !== null)
      planNextRun(expires);
  })
};

module.exports.rescheduleCleaner = rescheduleCleaner;
