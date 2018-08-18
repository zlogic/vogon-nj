var express = require('express');
var logger = require('./logger');

var errorHtml = "<!DOCTYPE html><html><head><title>Error</title></head></html><body><h1>{message}</h1><h2>{status}</h2><pre>{stack}</pre></body>"

var router = express.Router();

var renderError = function (err, req, res, next) {
  logger.logException(err);

  //Avoid sending stack in production
  var stack = '';
  if(req.app.get('env') === 'development')
    stack = err.stack.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  var renderedError = errorHtml.replace('{message}', err.message).replace('{status}', err.status).replace('{stack}', stack);

  res.status(err.status || 500);
  res.send(renderedError);
}

module.exports = renderError;
