var dbService = require('./model');

var logger = console.log;

var intervalHours = 24;

var tryIntervalMinutes = 10;

var run = function(){
  var taskName = "maintenance";
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
    logger("Next run scheduled for " + nextRun.toISOString());
    if(nextRun.getTime() <= new Date().getTime()){
      logger("Starting maintenance task");
      dbService.performMaintenance().then(function(){
        return workerTask.update({lastRun: new Date()}).then(function(){
          logger("Completed maintenance task");
        });
      });
    } else {
      logger("Skipping task");
    }
  });
};

setInterval(run, tryIntervalMinutes * 60 * 1000);

run();
