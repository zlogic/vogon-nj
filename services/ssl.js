var express = require('express');

var enforceSSL = function(req, res, next) {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV !== "development") {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
};

exports.enforceSSL = enforceSSL;
