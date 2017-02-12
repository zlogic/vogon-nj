var dbService = require('./dbservice');
var logger = require('./logger').logger;

var tasks = [];

var runTask = function(task){
  dbService.WorkerTask.findById(task.name).then(function(workerTask){
    if(workerTask === null)
      return dbService.WorkerTask.create({name: task.name});
    return workerTask;
  }).then(function(workerTask){
    logger.info("Starting " + task.name + " task");
    task.run().then(function(){
      return workerTask.update({lastRun: new Date()}).then(function(){
        logger.info("Completed " + task.name + " task");
        task.reschedule(task);
      });
    });
  });
};

var rescheduleTask = function(task, nextRun){
  if(task.timer !== undefined)
    clearTimeout(task.timer);
  delete task.timer;
  if(nextRun === undefined || nextRun === null){
    logger.verbose("No planned schedule for " + task.name + " task");
    return;
  }
  var currentTime = new Date();
  var sleepMillis = Math.max(nextRun.getTime() - currentTime.getTime(), 0);
  logger.verbose("Scheduling " + task.name + " task for " + nextRun.toISOString());
  task.timer = setTimeout(function(){
    runTask(task);
  }, sleepMillis);
};

tasks.push({
  name: 'maintenance',
  run: dbService.performMaintenance,
  reschedule: function(){
    var task = this;
    dbService.WorkerTask.findById(task.name).then(function(workerTask){
      var lastRun = workerTask !== null ? workerTask.lastRun : undefined;
      lastRun = lastRun || new Date();
      lastRun = new Date(lastRun);
      var nextRun = new Date(lastRun);
      nextRun.setMinutes(0);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);
      var intervalHours = parseInt(process.env.RUN_MAINTENANCE_HOURS_INTERVAL || 0);
      var intervalMillis = intervalHours * 60 * 60 * 1000;
      if(intervalMillis <= 0){
        logger.info("Task " + task.name + " is disabled");
        return;
      }
      nextRun = new Date(nextRun.getTime() + intervalMillis);
      rescheduleTask(task, nextRun);
    });
  }
});

var startWorker = function(){
  for(var i in tasks)
    tasks[i].reschedule();
};

module.exports.tasks = tasks;
module.exports.startWorker = startWorker;
