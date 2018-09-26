import { Injectable } from '@angular/core';
import { Observable, of, merge } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';

import { AccountsService } from './accounts.service';
import { TransactionsService } from './transactions.service';
import { UserService } from './user.service';

@Injectable()
export class UpdateService {
  update(): Observable<any> {
    return merge(
      this.accountsService.update().pipe(catchError((err) => of(err))),
      this.userService.update().pipe(catchError((err) => of(err)))
    );  
    //No need to update transactions, since they automatically update if accounts change
    //No need to update tags, since they automatically update if user data changes
  }
  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
    private userService: UserService
  ){
    this.update().subscribe();
    this.userService.importObservable.pipe(mergeMap(() => this.update())).subscribe();
  }
}
