import { Injectable } from '@angular/core';
import { Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { AuthorizationService } from './auth.service';
import { HTTPService, UpdateHelper } from './http.service';
import { UserService } from './user.service';

@Injectable()
export class TagsService {
  tags: string[] = [];
  private doUpdate: UpdateHelper;

  update(): Observable<any> {
    return this.doUpdate.update();
  }
  mergeTags(newTags: string[]) {
    newTags.forEach((newTag: string) => {
      if (!this.tags.some(function (tag) {
        return tag === newTag;
      }))
        this.tags.push(newTag);
    });
  };

  constructor(
    private httpService: HTTPService,
    private authorizationService: AuthorizationService,
    private userService: UserService
  ) {
    this.doUpdate = new UpdateHelper(() => {
      if(this.authorizationService.isAuthorized())
        return this.httpService.get("service/analytics/tags")
          .map((res: Response) => {
            this.tags = res.json();
            return res;
          });
      else {
        this.tags = [];
      }
    });
    this.authorizationService.authorizationObservable.subscribe(() => this.update().subscribe());
    this.userService.userObservable.subscribe(() => this.update().subscribe());
  }
}