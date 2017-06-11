var passport = require('passport');
var i18n = require('i18n');
var logger = require('../services/logger');
var dbService = require('./dbservice');
var tokencleaner = require('./tokencleaner');
var oauth2orize = require('oauth2orize');
var uuid = require('uuid');
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;

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
      return done(new Error(i18n.__("Bad credentials")));
    return user.validatePassword(password).then(function(passwordValid) {
      if(!passwordValid)
        throw new Error(i18n.__("Bad credentials"));
      return done(null, user);
    });
  }).catch(done);
}));

server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
  dbService.User.findOne({where: {username: dbService.normalizeUsername(username)}}).then(function (user) {
      if (!user)
        return done(new Error(i18n.__("Bad credentials")));
      return user.validatePassword(password).then(function(passwordValid) {
        if(!passwordValid)
          throw new Error(i18n.__("Bad credentials"));
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
            throw new Error(i18n.__("Cannot create token"));
          });
        };
        return createToken(5).catch(done);
      });
    }).catch(done);
}));

var allowRegistration= function(){
  return JSON.parse(process.env.ALLOW_REGISTRATION || false);
};

var logout = function(token){
  return dbService.Token.findById(token).then(function(foundToken){
    if(foundToken === null || foundToken === undefined)
      throw new Error(i18n.__("Cannot delete non-existing token %s", token));
    return foundToken.destroy();
  });
};

exports.allowRegistration = allowRegistration;
exports.oauth2server = server;
exports.logout = logout;
