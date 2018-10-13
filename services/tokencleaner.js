var dbService = require('./dbservice');
var logger = require('./logger').logger;

var plannedRun;

var rescheduleCleaner = async function(){
  if(plannedRun)
    clearTimeout(plannedRun);
  delete plannedRun;

  var planNextRun = function(expires){
    expires = new Date(expires);
    var currentTime = new Date();
    var sleepMillis = expires.getTime() - currentTime.getTime();
    sleepMillis = Math.max(sleepMillis, 0);
    logger.verbose("Planning expired token cleanup for " + expires.toISOString());
    plannedRun = setTimeout(function(){
      return dbService.deleteExpiredTokens().then(function(){
        rescheduleCleaner();
      });
    }, sleepMillis);
  };

  var expires = await dbService.Token.min('expires');
  if(expires !== null)
    planNextRun(expires);
};

module.exports.rescheduleCleaner = rescheduleCleaner;
