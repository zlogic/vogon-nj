import { Injectable, EventEmitter } from '@angular/core';
import { Response } from '@angular/http';
import { Observable, of } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';

import { AuthorizationService } from './auth.service';
import { HTTPService, UpdateHelper } from './http.service';

export class Account {
  id: number;
  version: number;
  name: string;
  currency: string;
  balance: number;
  showInList: boolean;
  includeInTotal: boolean;

  static fromJson(json: any): Account {
    var account = new Account();
    for(var property in json)
      account[property] = json[property];
    return account;
  }
  constructor(){ }
}

@Injectable()
export class AccountsService {
  accounts: Account[] = [];
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
    this.accountsObservable.emit();
  };
  getTotalsForCurrencies(): {total: number, currency: string}[] {
    var totals = {};
    //Compute totals for currencies
    this.accounts.forEach((account: Account) => {
      if (totals[account.currency] === undefined) {
        totals[account.currency] = 0;
      }
      totals[account.currency] += account.balance;
    });
    var result = [];
    for(var currency in totals) {
      result.push({currency: currency, total: totals[currency]});
    }
    return result;
  };
  update(): Observable<any> {
    return this.doUpdate.update();
  }
  submitAccounts() {
    return this.httpService.post("service/accounts", this.accounts)
      .pipe(
        mergeMap((res: Response) => {
          var accounts = res.json().map((account: any) => Account.fromJson(account));
          this.setAccounts(accounts);
          return of(res);
        }),
        catchError(() => this.update())
      );
  }
  
  constructor(
    private httpService: HTTPService,
    private authorizationService: AuthorizationService
  ) {
    this.doUpdate = new UpdateHelper(() => {
      if(this.authorizationService.isAuthorized())
        return this.httpService.get("service/accounts")
          .pipe(map((res: Response) => {
            var accounts = res.json().map((account: any) => Account.fromJson(account));
            this.setAccounts(accounts);
          }));
      else {
        this.accounts = [];
      }
    });
    this.authorizationService.authorizationObservable.subscribe(() => this.update().subscribe());
  }
}
