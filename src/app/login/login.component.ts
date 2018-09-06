import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthorizationService } from '../service/auth.service';
import { HTTPService } from '../service/http.service';
import { ConfigurationService } from '../service/configuration.service';

@Component({
  templateUrl: './login.component.html'
})

export class LoginComponent {
  mode: string = "login";
  username: string = "";
  password: string = "";
  rememberToken: boolean = false;
  errorMessage: string;
  
  constructor(
    private httpService: HTTPService,
    private authorizationService: AuthorizationService,
    private router: Router,
    private configurationService: ConfigurationService
  ){  }

  modeIsLogin(): boolean { return this.mode == "login"; }
  modeIsRegister(): boolean { return this.mode == "register"; }
  
  isAllowRegistration():boolean { return this.configurationService.isAllowRegistration(); }

  private onSuccess() {
    this.router.navigate(['/transactions']);
    this.errorMessage = undefined;
  }

  private login() {
    return this.authorizationService.performAuthorization(this.username, this.password, this.rememberToken)
      .subscribe(
        () => this.onSuccess(),
        (err) => this.errorMessage = err.json().error_description
      );
  }

  private register() {
    var user = {username: this.username, password: this.password};
    return this.httpService.post("register", user)
      .subscribe(
        () => this.login(),
        (err) => this.errorMessage = err.json().exception
      );
  }

  onSubmit() {
    if(this.mode === "login")
      this.login();
    else if(this.mode === "register")
      this.register();
  }
}
