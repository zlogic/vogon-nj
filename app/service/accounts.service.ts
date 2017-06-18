import { Injectable, EventEmitter } from '@angular/core';
import { Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { AuthorizationService } from './auth.service';
import { HTTPService, UpdateHelper } from './http.service';
import { CurrencyService } from './currency.service';

export class Account {
  id: number;
  name: string;
  currency: string;
  balance: number;
}

@Injectable()
export class AccountsService {
  private accounts: Account[] = [];
  private doUpdate: UpdateHelper;

  accountsObservable: EventEmitter<any> = new EventEmitter();

  getAccount(id: number): Account {
    return this.accounts.filter(function (account: Account) {
      return account.id === id;
    })[0];
  }
  setAccounts(accounts: Account[]) {
    this.accounts = accounts;
    this.accounts.sort(function (a, b) {
      return a.id - b.id;
    });
    this.updateTotalsForCurrencies();
    this.accountsObservable.emit();
  };
  updateTotalsForCurrencies() {
    var totals = {};
    //Compute totals for currencies
    this.accounts.forEach((account: Account) => {
      if (totals[account.currency] === undefined) {
        var currency = this.currencyService.findCurrency(account.currency);
        currency = currency !== undefined ? currency.currencyCode : undefined;
        totals[account.currency] = {total: 0, name: currency};
      }
      totals[account.currency].total += account.balance;
    });
    return totals;
  };
  update(): Observable<any> {
    return this.doUpdate.update();
  }
  submitAccounts(accounts: Account[]) {
    return this.httpService.post("service/accounts", accounts)
      .map((res: Response) => {
        var accounts = res.json().map((account: any) => Object.assign(new Account(), account));
        this.setAccounts(accounts);
        return Observable.of(res);
      })
      .catch(() => this.update());
  }
  
  constructor(
    private httpService: HTTPService,
    private authorizationService: AuthorizationService,
    private currencyService: CurrencyService
  ) {
    this.doUpdate = new UpdateHelper(() => {
      if(authorizationService.isAuthorized())
        return this.httpService.get("service/accounts")
          .map((res: Response) => {
            var accounts = res.json().map((account: any) => Object.assign(new Account(), account));
            this.setAccounts(accounts);
          });
      else {
        this.accounts = [];
      }
    });
    this.authorizationService.authorizationObservable.subscribe(() => this.update().subscribe());
    this.update().subscribe();
  }
}
