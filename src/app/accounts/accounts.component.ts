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
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss']
})

export class AccountsComponent {
  showAllAccounts: boolean;
  editingAccount: Account = undefined;
  displayedColumns: string[] = ['name', 'currency', 'balance', 'menu'];
  showAccounts: ViewAccount[] = [];

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
    let updatedShowAccounts = this.accountsService.accounts.filter((account) => account.showInList || this.showAllAccounts).map(account => {
      let existingShowAccount = this.showAccounts.find(showAccount => showAccount !== undefined  && showAccount.account === account);
      if(existingShowAccount !== undefined)
        return existingShowAccount;
      return new ViewAccount(account);
    });
    this.accountsService.getTotalsForCurrencies().forEach((totalCurrency) => {
      let account = new ViewAccount(totalCurrency.currency, totalCurrency.total);
      updatedShowAccounts.push(account);
    });
    this.showAccounts = updatedShowAccounts;
    return this.showAccounts;
  }
  constructor(
    public accountsService: AccountsService,
    public currencyService: CurrencyService
  ) { }
}
