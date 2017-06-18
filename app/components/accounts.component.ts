import { Component } from '@angular/core';

import { AccountsService } from '../service/accounts.service'
import { CurrencyService } from '../service/currency.service'

@Component({
  templateUrl: '../templates/components/accounts.pug'
})

export class AccountsComponent {
  constructor(public accountsService: AccountsService, public currencyService: CurrencyService) { }
}
