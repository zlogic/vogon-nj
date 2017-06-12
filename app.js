var express = require('express');
var path = require('path');
var compression = require('compression');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var i18n = require('i18n');
var passport = require('passport');

var routes = require('./routes/index');
var register = require('./routes/register');
var oauth = require('./routes/oauth');
var service = require('./routes/service');
var ssl = require('./services/ssl');
var logger = require('./services/logger');

var app = express();

// ssl
app.use(ssl.enforceSSL);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(compression());
app.use(favicon(path.join(__dirname, 'public', 'images/vogon-favicon.png')));
app.use(morgan('tiny', { stream: logger.stream }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
[
  "@angular/material",
  "material-design-icons"
].forEach(function(component){
  app.use('/js/' + component, express.static(path.join(__dirname , '/node_modules/' + component)));
})


app.use('/', routes);
app.use('/register', register);
app.use('/oauth', oauth);
app.use('/service', service);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error(i18n.__('Not Found'));
  err.status = 404;
  next(err);
});

// i18n
i18n.configure({
  locales: ['en'],
  directory: __dirname + '/locales'
});
app.use(i18n.init);
app.locals.__= i18n.__;

// authentication
app.use(passport.initialize());

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function errorHandler (err, req, res, next) {
    logger.logException(err);
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function errorHandler (err, req, res, next) {
  logger.logException(err);
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
