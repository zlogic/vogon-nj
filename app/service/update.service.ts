import { Injectable } from '@angular/core';

import { TransactionsService } from './transactions.service';
import { AccountsService } from './accounts.service';
import { TagsService } from './tags.service';

@Injectable()
export class UpdateService {
  private update() {
    this.accountsService.update().subscribe();
    //No need to update transactions, since they automatically update if accounts change
    this.tagsService.update().subscribe();
  }
  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
    private tagsService: TagsService
  ){
    this.update();
  }
}
