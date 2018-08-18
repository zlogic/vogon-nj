var passport = require('passport');
var logger = require('../services/logger');
var dbService = require('./dbservice');
var tokencleaner = require('./tokencleaner');
var oauth2orize = require('oauth2orize');
var uuid = require('uuid');
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var logger = require('../services/logger');

var server = oauth2orize.createServer();

var expireDate = function(){
  var date = new Date();
  var expireDays = parseFloat(process.env.TOKEN_EXPIRES_DAYS || 14);
  var expireMillis = expireDays * 24 * 60 * 60 * 1000;
  date.setTime(date.getTime() + expireMillis);
  return date;
};

passport.use(new BearerStrategy(function(token, cb) {
  dbService.Token.findById(token, {include: [dbService.User]}).then(function(token) {
    if(token === undefined || token === null)
      return cb(null, false);
    if(new Date(token.expires) <= new Date())
      return token.destroy().then(function(){
        cb(null, false);
      });
    var user = token.User;
    cb(null, user);
    return user;
  }).catch(cb);
}));

passport.use(new LocalStrategy(function(username, password, done) {
  dbService.User.findOne({where: {username: dbService.normalizeUsername(username)}}).then(function (user) {
    if (!user)
      throw new Error("Bad credentials");
    return user.validatePassword(password).then(function(passwordValid) {
      if(!passwordValid)
        throw new Error("Bad credentials");
      done(null, user);
      return null;
    });
  }).catch(done);
}));

server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
  dbService.User.findOne({where: {username: dbService.normalizeUsername(username)}}).then(function (user) {
    if (!user)
      throw new Error("Bad credentials");
    return user.validatePassword(password).then(function(passwordValid) {
      if(!passwordValid)
        throw new Error("Bad credentials");
      return null;
    }).then(function() {
      var createToken = function(remainingAttempts){
        var accessToken = uuid.v4();
        return user.createToken({id: accessToken, expires: expireDate()}).then(function(){
          done(null, accessToken);
          return tokencleaner.rescheduleCleaner();
        }).catch(function(err){
          logger.logException(err);
          remainingAttempts--;
          if(remainingAttempts > 0)
            return createToken(remainingAttempts);
          throw new Error("Cannot create token");
        });
      };
      return createToken(5);
    });
  }).catch(done);
}));

var allowRegistration= function(){
  return JSON.parse(process.env.ALLOW_REGISTRATION || false);
};

var logout = function(token){
  return dbService.Token.findById(token).then(function(foundToken){
    if(foundToken === null || foundToken === undefined){
      logger.logger.error("Token %s does not exist", token)
      throw new Error("Cannot delete non-existing token");
    }
    return foundToken.destroy();
  });
};

exports.allowRegistration = allowRegistration;
exports.oauth2server = server;
exports.logout = logout;
