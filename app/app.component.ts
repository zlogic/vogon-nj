import { Component } from '@angular/core';
import { AlertService, AuthService } from './service/auth.service';

@Component({
  selector: 'vogon-app',
  templateUrl: './templates/app.pug'
})

export class AppComponent {
  constructor(private alertService: AlertService, private authService: AuthService){ }
  
  isLoading(): boolean { 
    return this.alertService.isLoading();
  }

  isAuthorized(): boolean {
    return this.authService.isAuthorized();
  }

  //TODO: delete this test code
  test() {
    if(!this.alertService.isLoading())
    this.alertService.startLoadingRequest();
    else
    this.alertService.endLoadingRequest();
    this.alertService.addAlert("Hello");
  }
}
