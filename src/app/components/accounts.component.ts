import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';

import { AccountsService, Account } from '../service/accounts.service'
import { CurrencyService } from '../service/currency.service'

@Component({
  templateUrl: '../templates/components/accounts.html'
})

export class AccountsComponent {
  showAllAccounts: boolean;
  editingAccount: Account = undefined;

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
  constructor(
    public accountsService: AccountsService,
    public currencyService: CurrencyService
  ) { }
}
