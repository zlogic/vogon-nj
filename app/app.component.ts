import { Component } from '@angular/core';
import { AlertService } from './service/auth.service';

@Component({
  selector: 'vogon-app',
  template: require('./templates/app.pug')
})

export class AppComponent {
  constructor(private alertService: AlertService){ }
  
  isLoading(): boolean { 
    return this.alertService.isLoading();
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
