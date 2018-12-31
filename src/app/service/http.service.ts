import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Http, Response, Request, RequestMethod, Headers } from '@angular/http';
import { Observable, of, throwError } from 'rxjs';
import { mergeMap, catchError, finalize } from 'rxjs/operators';
import { I18nService } from './i18n.service';

@Injectable()
export class AlertService {
  private loadingRequests: number;

  constructor(private snackBar: MatSnackBar, private i18n: I18nService) {
    this.loadingRequests = 0;
  }

  addAlert(message: string) {
    this.snackBar.open(message, this.i18n.__('Dismiss'));
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

  resetAuthorization(): void {
    throw this.i18n.__("resetAuthorization not properly initialized");
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
  private errorHandler(data: Response | any): Observable<Response | any> {
    if (data.status === 401)
      this.resetAuthorization();
    if (data.status === 401 && this.isTokenURL(data.url)){
      return throwError(new Response({
        body: JSON.stringify({error_description: data.text()}),
        status: null, headers: null, url: null, merge: null
      }));
    } else {
      var errorMessage = this.i18n.__("HTTP error: {0} ({1})", data.status.toString(), data.text());
      this.alertService.addAlert(errorMessage);
      //TODO: refresh page to reset state?
    }
    return throwError(data);
  };
  encodeForm(data: any): string{
    var buffer = [];
    for (var name in data)
      buffer.push([encodeURIComponent(name), encodeURIComponent(data[name])].join("="));
    return buffer.join("&");
  }
  request(method: RequestMethod, url: string, data?:any, extraHeaders?:any): Observable<Response>{
    var headers = this.isTokenURL(url) ? new Headers(extraHeaders) : this.mergeHeaders(extraHeaders);
    var request = new Request({ method: method, headers: headers, url: url, body: data});
    this.alertService.startLoadingRequest();
    return this.http.request(request)
      .pipe(
        catchError((error: Response | any) => this.errorHandler(error)),
        finalize(() => this.alertService.endLoadingRequest())
      );
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

  constructor(private alertService:AlertService, private http: Http, private i18n: I18nService) {}
}

export class UpdateHelper {
  private updateRequested: boolean = false;
  private updateFunctionObservable: Observable<any>;
  private updateCompleted(result: any): Observable<any> {
    this.updateFunctionObservable = undefined;
    if(this.updateRequested)
      return this.doUpdate();
    return of(result);
  };
  inProgress(): boolean {
    return this.updateFunctionObservable !== undefined;
  }
  private doUpdate(): Observable<any> {
    this.updateRequested = false;
    this.updateFunctionObservable = this.updateFunction();
    if(this.updateFunctionObservable !== undefined)
      return this.updateFunctionObservable
        .pipe(
          mergeMap((res: Response | any) => {
            return this.updateCompleted(res);
          }),
          catchError((error: Response | any) => {
            this.updateRequested = false;
            this.updateFunctionObservable = undefined;
            return throwError(error);
          })
        );
    else
      return of();
  };
  update(): Observable<any> {
    this.updateRequested = true;
    if(!this.inProgress())
      return this.doUpdate();
    return this.updateFunctionObservable;
  };

  constructor(private updateFunction: () => Observable<any>) { }
}