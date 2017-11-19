import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { TransactionsService } from './transactions.service';
import { AccountsService } from './accounts.service';
import { TagsService } from './tags.service';
import { UserService } from './user.service';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/mergeMap';

@Injectable()
export class UpdateService {
  update(): Observable<any> {
    return Observable.merge(
      this.accountsService.update().catch((err) => Observable.of(err)),
      this.userService.update().catch((err) => Observable.of(err))
    );  
    //No need to update transactions, since they automatically update if accounts change
    //No need to update tags, since they automatically update if user data changes
  }
  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
    private tagsService: TagsService,
    private userService: UserService
  ){
    this.update().subscribe();
    this.userService.importObservable.mergeMap(() => this.update()).subscribe();
  }
}
