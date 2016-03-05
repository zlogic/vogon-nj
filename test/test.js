var modelTest = require('./model.js');
var serviceTest = require('./service.js');
var i18n = require('i18n');
var path = require('path');

i18n.configure({
  locales: ['en'],
  directory: path.join(__dirname, '..', 'locales')
});
i18n.init();
