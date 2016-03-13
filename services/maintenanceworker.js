var dbService = require('./model');
var logger = require('./logger').logger;

var intervalHours = 24;

var tryIntervalMinutes = 10;

var tasks = {};

var runTask = function(taskName){
  var getNextRun = function(lastRun){
    if(lastRun === undefined || lastRun === null) return undefined;
    nextRun = new Date(lastRun);
    nextRun.setMinutes(0);
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);
    var intervalMillis = intervalHours * 60 * 60 * 1000;
    nextRun = new Date(nextRun.getTime() + intervalMillis);
    return nextRun;
  };
  var workerTaskValues = {name: taskName};
  dbService.WorkerTask.findOrCreate({where: workerTaskValues, defaults: workerTaskValues}).spread(function(workerTask){
    var nextRun = getNextRun(workerTask.lastRun);
    if(nextRun === undefined) nextRun = new Date();
    logger.info("Next run scheduled for " + nextRun.toISOString());
    if(nextRun.getTime() <= new Date().getTime()){
      logger.info("Starting " + taskName + " task");
      tasks[taskName]();
    } else {
      logger.info("Skipping task " + taskName);
    }
  });
}

var run = function(){
  for(var taskName in tasks)
    runTask(taskName);
};

tasks.maintenance = function(){
  dbService.performMaintenance().then(function(){
    return workerTask.update({lastRun: new Date()}).then(function(){
      logger.info("Completed maintenance task");
    });
  });
};

tasks.deleteExpiredTokens = function(){
  dbService.deleteExpiredTokens().then(function(){
    logger.info("Completed deleteExpiredTokens task");
  });
};

//TODO: make tasks/interval configurable
delete tasks.maintenance;

var startWorker = function(){
  setInterval(run, tryIntervalMinutes * 60 * 1000);
};

module.exports.startWorker = startWorker;
module.exports.run = run;
