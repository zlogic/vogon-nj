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

passport.use(new BearerStrategy(async function(token, cb) {
  try {
  var token = await dbService.Token.findById(token, {include: [dbService.User]});
    if(token === undefined || token === null)
      return cb(null, false);
    if(new Date(token.expires) <= new Date()) {
      await token.destroy()
      return cb(null, false);
    }
    var user = token.User;
    cb(null, user);
    return user;
  } catch(err) {
    cb(err);
  }
}));

passport.use(new LocalStrategy(async function(username, password, done) {
  try {
    var user = await dbService.User.findOne({where: {username: dbService.normalizeUsername(username)}});
    if (!user)
      throw new Error("Bad credentials");
    var passwordValid = await user.validatePassword(password);
    if(!passwordValid)
      throw new Error("Bad credentials");
    done(null, user);
    return null;
  } catch(err) {
    done(err);
  }
}));

server.exchange(oauth2orize.exchange.password(async function(client, username, password, scope, done) {
  try {
    var user = await dbService.User.findOne({where: {username: dbService.normalizeUsername(username)}});
    if (!user)
      throw new Error("Bad credentials");
    var passwordValid = await user.validatePassword(password);
    if(!passwordValid)
      throw new Error("Bad credentials");
    var createToken = async function(remainingAttempts){
      var accessToken = uuid.v4();
      try {
        await user.createToken({id: accessToken, expires: expireDate()});
        done(null, accessToken);
        return tokencleaner.rescheduleCleaner();
      } catch(err) {
        logger.logException(err);
        remainingAttempts--;
        if(remainingAttempts > 0)
          return createToken(remainingAttempts);
        throw new Error("Cannot create token");
      }
    };
    await createToken(5);
  } catch(err) {
    done(err);
  }
}));

var allowRegistration= function(){
  return JSON.parse(process.env.ALLOW_REGISTRATION || false);
};

var logout = async function(token){
  var foundToken = await dbService.Token.findById(token);
  if(foundToken === null || foundToken === undefined){
    logger.logger.error("Token %s does not exist", token)
    throw new Error("Cannot delete non-existing token");
  }
  return foundToken.destroy();
};

exports.allowRegistration = allowRegistration;
exports.oauth2server = server;
exports.logout = logout;
