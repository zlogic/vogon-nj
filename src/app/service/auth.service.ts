import { Injectable, EventEmitter } from '@angular/core';
import { Response, Headers } from '@angular/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { AlertService, HTTPService } from './http.service';
import { I18nService } from './i18n.service';

@Injectable()
export class AuthorizationService {
  readonly clientId: string = "vogonweb";
  readonly postHeaders = new Headers({"Content-Type": "application/x-www-form-urlencoded"});

  private access_token: string;
  authorizationObservable: EventEmitter<any> = new EventEmitter();
  
  isAuthorized(): boolean {
    return this.access_token !== undefined;
  }
  getAccessToken(): string {
    return this.access_token;
  }
  private setToken(access_token:string, rememberToken:boolean) {
    if (access_token !== undefined) {
      this.access_token = access_token;
      if (rememberToken)
        localStorage.setItem("vogon_access_token", access_token);
      this.httpService.setAccessToken(access_token);
      this.authorizationObservable.emit();
    }
  };
  performAuthorization(username:string, password:string, rememberToken:boolean): Observable<Response> {
    var params = {username: username, password: password, client_id: this.clientId, grant_type: "password"};
    return this.httpService.post("oauth/token", this.httpService.encodeForm(params), this.postHeaders)
        .pipe(
          map((data: Response) => {
            this.setToken(data.json().access_token, rememberToken);
            return data;
          }),
          catchError((error: Response | any) => {
            this.resetAuthorization(this.i18n.__("Unable to authenticate"));
            return throwError(error);
          })
        );
  };
  logout(): Observable<Response> {
    if (this.access_token !== undefined) {
      var params = {token: this.access_token};
      return this.httpService.post("oauth/logout", this.httpService.encodeForm(params), this.postHeaders)
          .pipe(
            map((res: Response) => {
              this.resetAuthorization();
              return res;
            }),
            catchError((error: Response | any) => {
              this.resetAuthorization();
              return throwError(error);
            })
          );
    } else {
      this.resetAuthorization();
      return throwError(new Response({
        body: {error_description: this.i18n.__("Already logged out")},
        status: null, headers: null, url: null, merge: null
      }));
    }
  };
  resetAuthorization(message?:string) {
    this.httpService.setAccessToken();
    localStorage.removeItem("vogon_access_token");
    if(this.access_token === undefined)
      return;
    this.access_token = undefined;
    if (message !== undefined)
      this.alertService.addAlert(message);
    this.authorizationObservable.emit();
    this.router.navigate(['/login']);
  };

  constructor(private alertService:AlertService, private httpService: HTTPService, private router: Router, private i18n: I18nService) {
    this.httpService.resetAuthorization = () => this.resetAuthorization();
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
