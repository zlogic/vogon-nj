var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/dbservice');
var prepopulate = require('./utils/prepopulate').prepopulate;
var superagent = require('superagent');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

describe('Service', function() {
  serviceBase.hooks();

  describe('registration', function () {
    it('should be able to register a new user if registration is allowed', async function () {
      var userData = {username: "user01", password: "password"};
      process.env.ALLOW_REGISTRATION = true;

      var result = await superagent.post(baseUrl + "/register").send(userData);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, {username : 'user01'});
      var users = await dbService.User.findAll();
      assert.equal(users.length, 1);
      assert.equal(users[0].username, 'user01');
      var passwordValid = await users[0].validatePassword('password');
      assert.equal(passwordValid, true);
    });
    it('should not be able to register a new user if registration is not allowed', async function () {
      var userData = {username: "user01", password: "password"};
      process.env.ALLOW_REGISTRATION = false;

      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/register").send(userData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.body, {exception : 'Registration is not allowed'});
      var users = await dbService.User.findAll();
      assert.equal(users.length, 0);
    });
    it('should not be able to register a new user if the username is already in use', async function () {
      var userData = {username: "user01", password: "anotherpassword"};
      process.env.ALLOW_REGISTRATION = true;
      await prepopulate();

      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/register").send(userData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.body, {exception : 'User already exists'});
      var users = await dbService.User.findAll();
      assert.equal(users.length, 2);
      assert.equal(users[0].username, 'user01');
      assert.equal(users[1].username, 'user02');
      var passwordValid = await users[0].validatePassword('mypassword');
      assert.equal(passwordValid, true);
      passwordValid = await users[1].validatePassword('mypassword2');
      assert.equal(passwordValid, true);
    });
    it('should not be able to register a new user if the username is empty', async function () {
      var userData = {username: "", password: "anotherpassword"};
      process.env.ALLOW_REGISTRATION = true;

      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/register").send(userData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.body, {exception : 'Cannot register user because of error: {0}', args : ['SequelizeValidationError']});
      var users = await dbService.User.findAll();
      assert.equal(users.length, 0);
    });
    it('should not be able to register a new user if the password is empty', async function () {
      var userData = {username: "user01", password: ""};
      process.env.ALLOW_REGISTRATION = true;

      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/register").send(userData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.body, {exception : 'Cannot register user because of error: {0}', args : ['SequelizeValidationError']});
      var users = await dbService.User.findAll();
      assert.equal(users.length, 0);
    });
  });
});
