import { Component } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';

@Component({
  templateUrl: '../templates/components/login.pug',
})

export class LoginComponent {
  mode: string = "login";

  loginForm: FormGroup;
  
  constructor(formBuilder: FormBuilder){
    this.loginForm = formBuilder.group({
      'username': [null, Validators.required],
      'password': [null, Validators.required],
      'rememberToken': [false]
    });
  }

  modeIsLogin(): boolean { return this.mode == "login"; }
  modeIsRegister(): boolean { return this.mode == "register"; }
  
  isAllowRegistration():boolean { return allowRegistration; }

  onSubmit() {
    //TODO: do the actual AJAX call here
    console.log("submitting " + this.loginForm.controls['username'].value + ":" + this.loginForm.controls['password'].value + ", remember token=" + this.loginForm.controls['rememberToken'].value);
  }
}
