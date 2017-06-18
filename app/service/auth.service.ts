import { Injectable, EventEmitter } from '@angular/core';
import { Response, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { AlertService, HTTPService } from './http.service';

@Injectable()
export class AuthorizationService {
  readonly clientId: string = "vogonweb";
  readonly postHeaders = new Headers({"Content-Type": "application/x-www-form-urlencoded"});

  private access_token: string;
  authorizationObservable: EventEmitter<any> = new EventEmitter();
  
  isAuthorized(): boolean {
    return this.access_token !== undefined;
  }

  private setToken(access_token:string, rememberToken:boolean) {
    if (access_token !== undefined) {
      this.access_token = access_token;
      this.authorizationObservable.emit(undefined);
      if (rememberToken)
        localStorage.setItem("vogon_access_token", access_token);
      this.httpService.setAccessToken(access_token);
    }
  };
  performAuthorization(username:string, password:string, rememberToken:boolean): Observable<Response> {
    var params = {username: username, password: password, client_id: this.clientId, grant_type: "password"};
    return this.httpService.post("oauth/token", this.httpService.encodeForm(params), this.postHeaders)
        .map((data: Response) => {
          this.setToken(data.json().access_token, rememberToken);
          return data;
        })
        .catch((err) => {
          this.resetAuthorization(__("Unable to authenticate"));
          throw err;
        });
  };
  logout(): Observable<Response> {
    if (this.access_token !== undefined) {
      var params = {token: this.access_token};
      return this.httpService.post("oauth/logout", this.httpService.encodeForm(params), this.postHeaders)
          .map((res: Response) => {
            this.resetAuthorization();
            return res;
          })
          .catch((err) => {
            this.resetAuthorization();
            throw err;
          });
    } else {
      this.resetAuthorization();
      return Observable.throw(new Response({
        body: {error_description: __("Already logged out")},
        status: null, headers: null, url: null, merge: null
      }));
    }
  };
  resetAuthorization(message?:string) {
    this.access_token = undefined;
    this.authorizationObservable.emit(undefined);
    this.httpService.setAccessToken();
    localStorage.removeItem("vogon_access_token");
    if (message !== undefined)
      this.alertService.addAlert(message);
  };

  constructor(private alertService:AlertService, private httpService: HTTPService) {
    this.httpService.resetAuthorization = () => this.resetAuthorization;
    try {
      this.access_token = localStorage["vogon_access_token"];
    } catch (err) {
      this.access_token = undefined;
      alertService.addAlert(err);
    }
    if (this.access_token !== undefined) {
      this.httpService.setAccessToken(this.access_token);
    } else {
      this.httpService.setAccessToken();
    }
  }
}
