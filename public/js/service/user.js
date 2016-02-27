app.service("UserService", function ($rootScope, AuthorizationService, HTTPService, TagsService) {
  var that = this;
  this.userData = undefined;
  this.update = function () {
    if (AuthorizationService.authorized) {
      HTTPService.get("service/user", undefined, HTTPService.buildRequestParams(false))
          .then(function (data) {
            that.userData = data.data;
          }, function () {
            that.userData = undefined;
          });
      TagsService.update();
    }
  };
  this.submit = function (user) {
    return HTTPService.post("service/user", user)
        .then(function (data) {
          that.userData = data.data;
        }, that.update);
  };
  $rootScope.$watch(function () {
    return AuthorizationService.authorized;
  }, function () {
    $rootScope.$applyAsync(that.update);
  });
  this.update();
  HTTPService.updateUser = this.update;
});
