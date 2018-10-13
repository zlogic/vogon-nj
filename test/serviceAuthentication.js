var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/dbservice');
var prepopulate = require('./utils/prepopulate').prepopulate;
var superagent = require('superagent');
var uuid = require('uuid');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var sleep = serviceBase.sleep;
var tokenHeader = serviceBase.tokenHeader;

describe('Service', function() {
  serviceBase.hooks();

  var oneSecond = 1 / (24 * 60 * 60);

  describe('authentication', function () {
    it('should accept authentication of a valid user', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      assert.equal(result.status, 200);
      assert.ok(token);
      var tokens = await dbService.Token.findAll();
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].id, token);
      assert.equal(tokens[0].UserId, 1);
    });
    it('should delete authentication of a valid user on logout', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      assert.equal(result.status, 200);
      assert.ok(token);
      var tokens = await dbService.Token.findAll();
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].id, token);
      assert.equal(tokens[0].UserId, 1);

      var result = await superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token="+token);
      assert.ok(result);
      assert.equal(result.status, 200);
      assert.equal(result.text, "");
      var tokens = await dbService.Token.findAll();
      assert.deepEqual(tokens, []);
    });
    it('should reject authentication for expired tokens', async function () {
      this.timeout(4000);
      var userData = {username: "user01", password: "mypassword"};
      try {
        process.env.TOKEN_EXPIRES_DAYS = oneSecond.toString();
        await prepopulate();

        var {token, result} = await authenticateUser(userData);
        assert.equal(result.status, 200);
        assert.ok(token);
        var tokens = await dbService.Token.findAll();
        assert.equal(tokens.length, 1);
        assert.equal(tokens[0].id, token);
        assert.equal(tokens[0].UserId, 1);

        await sleep(1000);
        var error;
        var result;
        try {
          await superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token="+token);
        } catch(err) {
          error = err;
          result = err.response;
        }
        assert.ok(error);
        assert.equal(result.status, 401);
        assert.equal(result.text, "Unauthorized");
        var tokens = await dbService.Token.findAll();
        assert.deepEqual(tokens, []);
      } finally {
        delete process.env.TOKEN_EXPIRES_DAYS;
      }
    });
    it('should perform maintenance of expired tokens by deleting them', async function () {
      this.timeout(4000);
      var userData = {username: "user01", password: "mypassword"};
      try {
        process.env.TOKEN_EXPIRES_DAYS = oneSecond.toString();
        await prepopulate();

        var {token, result} = await authenticateUser(userData);
        assert.equal(result.status, 200);
        assert.ok(token);
        var tokens = await dbService.Token.findAll();
        assert.equal(tokens.length, 1);
        assert.equal(tokens[0].id, token);
        assert.equal(tokens[0].UserId, 1);

        await sleep(1000);
        await dbService.deleteExpiredTokens();
        var tokens = await dbService.Token.findAll();
        assert.deepEqual(tokens, []);
      } finally {
        delete process.env.TOKEN_EXPIRES_DAYS;
      }
    });
    it('should retry token generation in case a generated token uuid is already in use', async function () {
      var userData1 = {username: "user01", password: "mypassword"};
      var userData2 = {username: "user02", password: "mypassword2"};
      var defaultGenerator = uuid.v4;

      var generatorPattern = {1: "1", 2: "1", 3:"1", 4: "1", 5: "1", 6: "2"};
      var generatorCounter = 0;
      var brokenGenerator = function(){
        generatorCounter++;
        return generatorPattern[generatorCounter] || generatorCounter;
      };
      await prepopulate();

      try {
        uuid.v4 = brokenGenerator;
        var {token, result} = await authenticateUser(userData1);
        assert.equal(result.status, 200);
        assert.equal(token, "1");

        var {token, result} = await authenticateUser(userData2);
        assert.equal(result.status, 200);
        assert.equal(token, "2");
        assert.equal(generatorCounter, 6);

        var tokens = await dbService.Token.findAll();
        assert.equal(tokens.length, 2);
        assert.equal(tokens[0].id, "1");
        assert.equal(tokens[0].UserId, 1);
        assert.equal(tokens[1].id, "2");
        assert.equal(tokens[1].UserId, 2);
      } finally {
        uuid.v4 = defaultGenerator;
      }
    });
    it('should give up retrying token generation in case a generated token uuid is already in use if number of attempts is exceeded', async function () {
      this.timeout(10000);
      var userData1 = {username: "user01", password: "mypassword"};
      var userData2 = {username: "user02", password: "mypassword2"};
      var defaultGenerator = uuid.v4;

      var generatorCounter = 0;
      var brokenGenerator = function(){
        generatorCounter++;
        return "1";
      };
      await prepopulate();
      try {
        uuid.v4 = brokenGenerator;
        var {token, result} = await authenticateUser(userData1);
        assert.equal(result.status, 200);
        assert.equal(token, "1");

        var error;
        var result;
        try {
          await authenticateUser(userData2);
        } catch(err) {
          error = err;
        }

        token = error.response.body.access_token;
        assert.ok(error);
        assert.equal(error.status, 500);
        assert.equal(!!token, false);
        assert.equal(generatorCounter, 1 + 5);
        assert.deepEqual(error.response.body, {error:"server_error", error_description:"Cannot create token"});

        var tokens = await dbService.Token.findAll();
        assert.equal(tokens.length, 1);
        assert.equal(tokens[0].id, "1");
        assert.equal(tokens[0].UserId, 1);
      } finally {
        uuid.v4 = defaultGenerator;
      }
    });
    it('should reject authentication of an invalid user', async function () {
      var userData = {username: "user01", password: "badpassword"};
      await prepopulate();

      var error;
      try {
        await authenticateUser(userData);
      } catch(err) {
        error = err;
      }

      var token = error.response.body.access_token;
      assert.ok(error);
      assert.equal(error.status, 500);
      assert.equal(error.response.body.error_description, 'Bad credentials');
      assert.equal(!!token, false);
    });
    it('should reject logout for a non-existing token', async function () {
      var userData = {username: "user01", password: "mypassword"};
      await prepopulate();

      var {token, result} = await authenticateUser(userData);
      assert.equal(result.status, 200);
      assert.ok(token);
      var tokens = await dbService.Token.findAll();
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].id, token);
      assert.equal(tokens[0].UserId, 1);

      var error;
      var result;
      try {
        await superagent.post(baseUrl + "/oauth/logout").set(tokenHeader(token)).send("token=badtoken");
      } catch(err) {
        error = err;
        result = err.response;
      }
      assert.ok(error);
      assert.equal(result.status, 500);
      assert.deepEqual(result.body, {error:"server_error", error_description:"Cannot delete non-existing token"});
      var tokens = await dbService.Token.findAll();
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].id, token);
      assert.equal(tokens[0].UserId, 1);
    });
  });
});
