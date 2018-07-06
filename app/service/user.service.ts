import { Injectable, EventEmitter } from '@angular/core';
import { Response } from '@angular/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { AuthorizationService } from './auth.service';
import { HTTPService, UpdateHelper } from './http.service';

@Injectable()
export class UserService {
  username: string;
  private version: string;
  private doUpdate: UpdateHelper;
  userObservable: EventEmitter<any> = new EventEmitter();
  importObservable: EventEmitter<any> = new EventEmitter();

  update(): Observable<any> {
    return this.doUpdate.update();
  }
  submit(userdata: any): Observable<any> {
    userdata['version'] = this.version;
    return this.httpService.post("service/user", userdata)
      .pipe(
        map((res) => {
          this.username = res.json().username;
          this.version = res.json().version;
          this.userObservable.emit();
          return res;
        }),
        catchError(() => this.update())
      );
  };
  importData(file: File): Observable<any> {
    if (file === undefined)
      return of();
    var formData = new FormData();
    formData.append("file", file);
    return this.httpService.post("service/import", formData)
      .pipe(map((res) => {
        this.importObservable.emit();
        return res;
      }));
  };
  constructor(
    private httpService: HTTPService,
    private authorizationService: AuthorizationService,
  ) {
    this.doUpdate = new UpdateHelper(() => {
      if(this.authorizationService.isAuthorized())
        return this.httpService.get("service/user")
          .pipe(map((res: Response) => {
            this.username = res.json().username;
            this.version = res.json().version;
            this.userObservable.emit();
            return res;
          }));
      else {
        this.username = undefined;
        this.version = undefined;
      }
    });
    this.authorizationService.authorizationObservable.subscribe(() => this.update().subscribe());
  }
}