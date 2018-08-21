var express = require('express');
var path = require('path');
var compression = require('compression');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');

var routes = require('./routes/index');
var register = require('./routes/register');
var oauth = require('./routes/oauth');
var service = require('./routes/service');
var ssl = require('./services/ssl');
var logger = require('./services/logger');
var errorrenderer = require('./services/errorrenderer');

var app = express();

// ssl
app.use(ssl.enforceSSL);

app.use(compression());
app.use(favicon(path.join(__dirname, 'dist', 'vogon-nj', 'favicon.ico')));
app.use(morgan('tiny', { stream: logger.stream }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist', 'vogon-nj')));

app.use('/', routes);
app.use('/register', register);
app.use('/oauth', oauth);
app.use('/service', service);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// authentication
app.use(passport.initialize());

// error handler

app.use(errorrenderer);


module.exports = app;
