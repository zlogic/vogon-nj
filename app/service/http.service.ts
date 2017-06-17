import { Injectable } from '@angular/core';
import { MdSnackBar } from '@angular/material';
import { Http, Response, Request, RequestOptions, RequestMethod, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class AlertService {
  private loadingRequests: number;

  constructor(private snackBar: MdSnackBar) {
    this.loadingRequests = 0;
  }

  addAlert(message: string) {
    this.snackBar.open(message, __('Dismiss'));
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
export class HTTPService {
  readonly tokenRegex = /^oauth\/token$/;
  private authorizationHeaders: Headers = new Headers();

  resetAuthorization = function(): void {
    throw __("resetAuthorization not properly initialized");
  }

  private mergeHeaders(extraHeaders: Headers): Headers {
    var headers = new Headers(this.authorizationHeaders);
    if(extraHeaders !== undefined)
      extraHeaders.keys().forEach(function(key) {
        headers.set(key, extraHeaders.get(key));
      });
    return headers;
  }
  private isTokenURL(url:string): boolean {
    return this.tokenRegex.test(url);
  }
  private errorHandler(data: any) {
    this.alertService.endLoadingRequest();
    if (data.status === 401)
      this.resetAuthorization();
    if (data.status === 401 && this.isTokenURL(data.url)){
      return Observable.throw(new Response({
        body: {error_description: data.text()},
        status: null, headers: null, url: null, merge: null
      }));
    } else {
      //TODO: use a better formatter plugin for i18n?
      var errorMessage = __("HTTP error: {0} ({1})").replace("{0}", data.status.toString()).replace("{1}", data.text());
      this.alertService.addAlert(errorMessage);
      //TODO: refresh page to reset state?
    }
    return Observable.throw(data);
  };
  private successHandler() {
    this.alertService.endLoadingRequest();
  }
  encodeForm(data: any): string{
    var buffer = [];
    for (var name in data)
      buffer.push([encodeURIComponent(name), encodeURIComponent(data[name])].join("="));
    return buffer.join("&");
  }
  request(method: RequestMethod, url: string, data?:any, extraHeaders?:any): Observable<Response>{
    this.alertService.startLoadingRequest();
    var headers = this.isTokenURL(url) ? new Headers(extraHeaders) : this.mergeHeaders(extraHeaders);
    var request = new Request({ method: method, headers: headers, url: url, body: data});
    return this.http.request(request)
      .map((res:Response) => {
        this.alertService.endLoadingRequest();
        return res;
      })
      .catch((err:any) => this.errorHandler(err));
  }
  get(url:string, extraHeaders?:Headers): Observable<Response> {
    return this.request(RequestMethod.Get, url, undefined, extraHeaders);
  }
  delete(url:string, extraHeaders?:Headers): Observable<Response> {
    return this.request(RequestMethod.Delete, url, undefined, extraHeaders);
  }
  post(url:string, data:any, extraHeaders?:Headers): Observable<Response> {
    return this.request(RequestMethod.Post, url, data, extraHeaders);
  }
  setAccessToken(access_token?:string) {
    if (access_token !== undefined)
      this.authorizationHeaders = new Headers({Authorization: "Bearer " + access_token});
    else
      this.authorizationHeaders = new Headers();
  }
  updateAllData() {
    this.updateAccounts();
    this.updateTransactions();
    this.updateUser();
  }
  updateAccounts(): Observable<Response> {
    return Observable.throw(__("updateAccounts not properly initialized"));
  }
  updateTransactions(): Observable<Response> {
    return Observable.throw(__("updateTransactions not properly initialized"));
  }
  updateUser(): Observable<Response> {
    return Observable.throw(__("updateUser not properly initialized"));
  }

  constructor(private alertService:AlertService, private http: Http) {}
}

export class UpdateHelper {
  private updateRequested: boolean = false;
  private updateFunctionObservable: Observable<any>;
  private updateCompleted(result: any): Observable<any> {
    this.updateFunctionObservable = undefined;
    if(this.updateRequested)
      return this.doUpdate();
    return Observable.of(result);
  };
  inProgress(): boolean {
    return this.updateFunctionObservable !== undefined;
  }
  private doUpdate(): Observable<any> {
    this.updateRequested = false;
    this.updateFunctionObservable = this.updateFunction();
    if(this.updateFunctionObservable !== undefined)
      return this.updateFunctionObservable
        .map((res) => {
          return this.updateCompleted(res);
        })
        .catch((err) => {
          return this.updateCompleted(undefined);
        });
    else
      return Observable.of(undefined);
  };
  update(): Observable<any> {
    this.updateRequested = true;
    if(!this.inProgress())
      return this.doUpdate();
    return this.updateFunctionObservable;
  };

  constructor(private updateFunction: () => Observable<any>) { }
}