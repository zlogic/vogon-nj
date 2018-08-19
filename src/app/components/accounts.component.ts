import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';

import { AccountsService, Account } from '../service/accounts.service'
import { CurrencyService } from '../service/currency.service'

class ViewAccount {
  account: Account;
  totalCurrency: {total: number, currency: string};

  constructor(account: Account)
  constructor(currency: string, total: number)
  constructor(account: Account | string, total?: number) {
    if(typeof(account) === 'string' && total !== undefined)
      this.totalCurrency = {total: total, currency: account};
    else if(account instanceof Account)
      this.account = account;
  }
  isTotal(): boolean {
    return this.account === undefined;
  }
  getCurrency(): string {
    if(this.account !== undefined)
      return this.account.currency;
    else
      return this.totalCurrency.currency;
  }
  getAmount(): number {
    if(this.account !== undefined)
      return this.account.balance;
    else
      return this.totalCurrency.total;
  }
  getName(): string {
    if(this.account !== undefined)
      return this.account.name;
  }
}

@Component({
  templateUrl: '../templates/components/accounts.html'
})

export class AccountsComponent {
  showAllAccounts: boolean;
  editingAccount: Account = undefined;
  displayedColumns: string[] = ['name', 'currency', 'balance', 'menu'];

  isEditing(): boolean {
    return this.editingAccount !== undefined;
  }
  createAccount() {
    if(this.editingAccount !== undefined){
      this.accountsService.update().subscribe(() => {
        this.editingAccount = undefined;
        this.createAccount();
      });
      return;
    }
    var account = Account.fromJson({includeInTotal: true, showInList: true});
    this.accountsService.accounts.push(account);
    this.startEditing(account);
  };
  startEditing(account: Account) {
    this.editingAccount = account;
  }
  cancelEditing() {
    this.editingAccount = undefined;
    this.accountsService.update().subscribe();
  }
  submitEditing(transactionForm: NgForm) {
    this.editingAccount = undefined;
    this.accountsService.submitAccounts().subscribe();
  }
  deleteAccount(account: Account) {
    this.accountsService.accounts = this.accountsService.accounts.filter(function (comp) {
      return comp !== account;
    });
    this.accountsService.submitAccounts().subscribe();
  }
  getAccounts(): ViewAccount[] {
    let showAccounts = this.accountsService.accounts.filter((account) => account.showInList || this.showAllAccounts).map(account => new ViewAccount(account));
    this.accountsService.getTotalsForCurrencies().forEach((totalCurrency) => {
      let account = new ViewAccount(totalCurrency.currency, totalCurrency.total);
      showAccounts.push(account);
    });
    return showAccounts;
  }
  constructor(
    public accountsService: AccountsService,
    public currencyService: CurrencyService
  ) { }
}
