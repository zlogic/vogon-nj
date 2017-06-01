import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/rx'

class Alert {
  msg: string;
  class: string;
}

@Injectable()
export class AlertService {
  public alerts: Alert[];
  private loadingRequests: number;

  constructor() {
    this.alerts = [];
    this.loadingRequests = 0;
  }
  
  closeAlert(alertIndex: number) {
    this.alerts.splice(alertIndex, 1);
  }

  addAlert(message: string) {
    var alert = {msg: message, class: "alert-danger"};
    this.alerts.push(alert);
    Observable.timer(30000).subscribe(() => {
      var alertIndex = this.alerts.indexOf(alert);
      if (alertIndex !== -1)
        this.closeAlert(alertIndex);
    });
  }

  startLoadingRequest() {
    this.loadingRequests++;
  }

  endLoadingRequest(){
    this.loadingRequests--;
  }

  isLoading():boolean {
    return this.loadingRequests > 0;
  }
}

@Injectable()
export class AuthService {
  constructor() {}
  
}
