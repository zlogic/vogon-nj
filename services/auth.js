var passport = require('passport');
var i18n = require('i18n');
var dbService = require('./model');
var oauth2orize = require('oauth2orize');
var uuid = require('uuid');
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;

var server = oauth2orize.createServer();

var expireDate = function(){
  var date = new Date();
  var expireDays = parseInt(process.env.TOKEN_EXPIRES_DAYS || 14);
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
    user.validatePassword(password, function(err, passwordValid){
      if(err)
        return done(err);
      if(!passwordValid)
        return done(new Error(i18n.__("Bad credentials")));
      return done(null, user);
    });
  }).catch(done);
}));

server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
  dbService.User.findOne({where: {username: dbService.normalizeUsername(username)}}).then(function (user) {
      if (!user)
        return done(new Error(i18n.__("Bad credentials")));
      user.validatePassword(password, function(err, passwordValid){
        if(err)
          return done(err);
        if(!passwordValid)
          return done(new Error(i18n.__("Bad credentials")));
        var accessToken = uuid.v4();
        user.createToken({id: accessToken, expires: expireDate()}).then(function(){
          done(null, accessToken);
        })
      });
    }).catch(done);
}));

var allowRegistration= function(){
  return JSON.parse(process.env.ALLOW_REGISTRATION || false);
};

var logout = function(token){
  return dbService.Token.findById(token).then(function(token){
    return token.destroy();
  });
};

exports.allowRegistration = allowRegistration;
exports.oauth2server = server;
exports.logout = logout;
