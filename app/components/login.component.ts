import { Component } from '@angular/core';

@Component({
  templateUrl: '../templates/components/login.pug',
})

export class LoginComponent {
  mode: string = "login";

  modeIsLogin(): boolean { return this.mode == "login"; }
  modeIsRegister(): boolean { return this.mode == "register"; }
}
