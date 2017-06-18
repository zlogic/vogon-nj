import { Injectable } from '@angular/core';

import { TransactionsService } from './transactions.service';
import { AccountsService } from './accounts.service';

@Injectable()
export class UpdateService {
  private update() {
    this.accountsService.update().subscribe();
    //No need to update transactions, since they automatically update if accounts change
  }
  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService
  ){ this.update(); }
}
