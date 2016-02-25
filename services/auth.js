var passport = require('passport');
var i18n = require('i18n');
var dbService = require('./model');
var oauth2orize = require('oauth2orize');
var uid2 = require('uid2');
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;

var server = oauth2orize.createServer();

// TODO: keep this in database?
// TODO: expire tokens
var tokens = {};

passport.use(new BearerStrategy(
  function(token, cb) {
    if(tokens[token] === undefined){
      cb(null, false);
    } else {
      dbService.User.findById(tokens[token]).then(function(user) {
        cb(null, user);
      }).catch(cb);
    }
  }));

passport.use(new LocalStrategy(
  function(username, password, done) {
    dbService.User.findOne({where: {username: username}}).then(function (user) {
      if (!user)
        return done(new Error(i18n.__("Bad credentials")));
      user.validatePassword(password, function(err, passwordValid){
        if(err)
          return done(err);
        if(!passwordValid)
          return done(new Error(i18n.__("Bad credentials")));
        done(null, user);
      });
    }).catch(done);
  }
));

server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
  dbService.User.findOne({where: {username: username}}).then(function (user) {
      if (!user)
        return done(new Error(i18n.__("Bad credentials")));
      user.validatePassword(password, function(err, passwordValid){
        if(err)
          return done(err);
        if(!passwordValid)
          return done(new Error(i18n.__("Bad credentials")));
        var accessToken = uid2(256);
        tokens[accessToken] = user.id;
        done(null, accessToken);
      });
    }).catch(done);
}));

var allowRegistration= function(){
  return process.env.ALLOW_REGISTRATION !== undefined ? JSON.parse(process.env.ALLOW_REGISTRATION) : false;
};

var logout = function(token){
  delete tokens[token];
}

exports.allowRegistration = allowRegistration;
exports.oauth2server = server;
exports.logout = logout;
