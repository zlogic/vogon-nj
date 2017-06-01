import { Component } from '@angular/core';
import { AlertService } from '../service/auth.service';

@Component({
  selector: 'notification',
  template: require('views/fragments/notification.pug')
})

export class NotificationComponent { 
  constructor(
    private alertService: AlertService
  ) {}
}
