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

  var validateDefaultUserdata = async function(){
    var users = await dbService.User.findAll();
    assert.equal(users.length, 2);
    assert.equal(users[0].username, 'user01');
    assert.equal(users[1].username, 'user02');
    var passwordValid = await users[0].validatePassword('mypassword');
    assert.equal(passwordValid, true);
    passwordValid = await users[1].validatePassword('mypassword2');
    assert.equal(passwordValid, true);
  };

  describe('userdata', function () {
    it('should get details for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/user").set(tokenHeader(token));
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { username: 'user01', version: 0 });
    });
    it('should be able to change the username for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {username: "user03"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { username: 'user03', version: 1 });
      var users = await dbService.User.findAll();
      assert.equal(users.length, 2);
      assert.equal(users[0].username, 'user03');
      assert.equal(users[1].username, 'user02');
      var passwordValid = await users[0].validatePassword('mypassword');
      assert.equal(passwordValid, true);
      passwordValid = await users[1].validatePassword('mypassword2');
      assert.equal(passwordValid, true);
    });
    it('should be able to change the password for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {password: "mypassword1"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { username: 'user01', version: 1 });
      var users = await dbService.User.findAll();
      assert.equal(users.length, 2);
      assert.equal(users[0].username, 'user01');
      assert.equal(users[1].username, 'user02');
      passwordValid = await users[0].validatePassword('mypassword1');
      assert.equal(passwordValid, true);
      passwordValid = await users[1].validatePassword('mypassword2');
      assert.equal(passwordValid, true);
    });
    it('should be able to change the username and password for an authenticated user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {username: "user03", password: "mypassword1"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { username: 'user03', version: 1 });
      var users = await dbService.User.findAll();
      assert.equal(users.length, 2);
      assert.equal(users[0].username, 'user03');
      assert.equal(users[1].username, 'user02');
      var passwordValid = await users[0].validatePassword('mypassword1');
      assert.equal(passwordValid, true);
      passwordValid = await users[1].validatePassword('mypassword2');
      assert.equal(passwordValid, true);
    });
    it('should not be able to change the username for an authenticated user if the username is already in use', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {username: "user02"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.text, 'Validation error');
      await validateDefaultUserdata();
    });
    it('should not be able to change the username for an authenticated user if the new username is empty', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {username: ""};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.text, 'Validation error: Validation notEmpty on username failed');
      await validateDefaultUserdata();
    });
    it('should not be able to change the password for an authenticated user if the new password is empty', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {password: ""};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData);
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.text, 'Validation error: Validation notEmpty on password failed');
      await validateDefaultUserdata();
    });
    it('should ignore id in requests for getting user data and use OAuth data instead', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.get(baseUrl + "/service/user").set(tokenHeader(token)).send({id: 2});
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { username: 'user01', version: 0 });
    });
    it('should ignore id in requests for changing user data and use OAuth data instead', async function () {
      var userData = {username: "user01", password: "mypassword"};
      var newUserData = {username: "user03", password: "mypassword1", id: 2};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      var result = await superagent.post(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { username: 'user03', version: 1 });
      var users = await dbService.User.findAll();
      assert.equal(users.length, 2);
      assert.equal(users[0].username, 'user03');
      assert.equal(users[1].username, 'user02');
      var passwordValid = await users[0].validatePassword('mypassword1');
      assert.equal(passwordValid, true);
      passwordValid = await users[1].validatePassword('mypassword2');
      assert.equal(passwordValid, true);
    });
    it('should not be able to get user data for an unauthenticated user (no token)', async function () {
      await prepopulate();

      var error;
      try {
        await superagent.get(baseUrl + "/service/user");
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to get user data for an unauthenticated user (bad token)', async function () {
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.get(baseUrl + "/service/user").set(tokenHeader(token));
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
    });
    it('should not be able to change user data for an unauthenticated user (no token)', async function () {
      var newUserData = {username: "user03", password: "mypassword1", id: 2};
      await prepopulate();

      var error;
      try {
        await superagent.get(baseUrl + "/service/user").send(newUserData);
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
      await validateDefaultUserdata();
    });
    it('should not be able to change user data for an unauthenticated user (bad token)', async function () {
      var newUserData = {username: "user03", password: "mypassword1", id: 2};
      await prepopulate();

      var token = 'aaaa';
      var error;
      try {
        await superagent.get(baseUrl + "/service/user").set(tokenHeader(token)).send(newUserData);
      } catch(err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.status, 401);
      assert.equal(error.response.text, 'Unauthorized');
      await validateDefaultUserdata();
    });
  });
});
