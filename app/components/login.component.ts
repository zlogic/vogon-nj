import { Component } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { Response } from '@angular/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { AuthorizationService } from '../service/auth.service';
import { HTTPService } from '../service/http.service';
import { ConfigurationService } from '../service/configuration.service';

@Component({
  templateUrl: '../templates/components/login.pug'
})

export class LoginComponent {
  mode: string = "login";

  loginForm: FormGroup;

  errorMessage: string;
  
  constructor(
    private formBuilder: FormBuilder,
    private httpService: HTTPService,
    private authorizationService: AuthorizationService,
    private router: Router,
    private configurationService: ConfigurationService
  ){
    this.loginForm = formBuilder.group({
      'username': [null, Validators.required],
      'password': [null, Validators.required],
      'rememberToken': [false]
    });
  }

  modeIsLogin(): boolean { return this.mode == "login"; }
  modeIsRegister(): boolean { return this.mode == "register"; }
  
  isAllowRegistration():boolean { return this.configurationService.isAllowRegistration(); }

  private onSuccess() {
    this.router.navigate(['/transactions']);
    this.loginForm.reset();
    this.errorMessage = undefined;
  }

  private login(username: string, password: string, rememberToken: boolean) {
    return this.authorizationService.performAuthorization(username, password, rememberToken)
      .subscribe(
        () => this.onSuccess(),
        (err) => this.errorMessage = err.json().error_description
      );
  }

  private register(username: string, password: string, rememberToken: boolean) {
    var user = {username: username, password: password};
    return this.httpService.post("register", user)
      .subscribe(
        () => this.login(username, password, rememberToken),
        (err) => this.errorMessage = err.json().exception
      );
  }

  onSubmit() {
    var username = this.loginForm.controls['username'].value
    var password = this.loginForm.controls['password'].value;
    var rememberToken = this.loginForm.controls['rememberToken'].value;
    if(this.mode === "login")
      this.login(username, password, rememberToken);
    else if(this.mode === "register")
      this.register(username, password, rememberToken);
  }
}
