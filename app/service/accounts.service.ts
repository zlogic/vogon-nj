import { Injectable } from '@angular/core';
import { Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

export class Account {
  id: number;
  name: string;
  currency: string;
}

@Injectable()
export class AccountsService {
  update(): Observable<any> {
    //TODO: implement the actual update method
    return Observable.of(undefined);
  }
  getAccount(id: number): Account {
    //TODO: implement the actual lookup method
    var account = new Account();
    account.id = id;
    account.name = "Temp account";
    account.currency = "EUR";
    return account;
  }
  updateTransactions(): Observable<Response> {
    return Observable.throw(__("updateTransactions not properly initialized"));
  }
}