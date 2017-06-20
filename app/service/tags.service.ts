import { Injectable } from '@angular/core';
import { Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { AuthorizationService } from './auth.service';
import { HTTPService, UpdateHelper } from './http.service';

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
    private authorizationService: AuthorizationService
  ) {
    this.doUpdate = new UpdateHelper(() => {
      if(authorizationService.isAuthorized())
        return this.httpService.get("service/analytics/tags")
          .map((res: Response) => {
            this.tags = res.json();
          });
      else {
        this.tags = [];
      }
    });
    this.authorizationService.authorizationObservable.subscribe(() => this.update().subscribe());
  }
}