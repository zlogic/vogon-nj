import { Component, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DOCUMENT } from '@angular/platform-browser';

import { PageScrollService, PageScrollInstance } from 'ngx-page-scroll';

import { AccountsService, Account } from '../service/accounts.service'
import { CurrencyService } from '../service/currency.service'

@Component({
  templateUrl: '../templates/components/accounts.pug'
})

export class AccountsComponent {
  accountForm: FormGroup;
  showAllAccounts: boolean;
  editingAccount: Account = undefined;

  isEditing(account: Account): boolean {
    return this.editingAccount == account;
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
    this.accountForm.controls['showInList'].setValue(account.showInList);
    if (account.id === undefined) {
      let pageScrollInstance: PageScrollInstance = PageScrollInstance.newInstance({document: this.document, scrollTarget: '#accountEditor', pageScrollOffset: 64+24});
      this.pageScrollService.start(pageScrollInstance);
    }
  }
  cancelEditing() {
    this.editingAccount = undefined;
    this.accountsService.update().subscribe();
  }
  submitEditing() {
    if(this.editingAccount !== undefined) {
      this.editingAccount.showInList = this.accountForm.controls['showInList'].value;
    }
    this.editingAccount = undefined;
    this.accountsService.submitAccounts().subscribe();
  }
  deleteAccount(account: Account) {
    this.accountsService.accounts = this.accountsService.accounts.filter(function (comp) {
      return comp !== account;
    });
    this.accountsService.submitAccounts().subscribe();
  }
  ngOnInit() {
    this.accountForm = this.formBuilder.group({
      'name': [null, Validators.required],
      'currency': [null, Validators.required],
      'includeInTotal': [null, Validators.required],
      'showInList': [null, Validators.required]
    });
  }
  constructor(
    public accountsService: AccountsService,
    public currencyService: CurrencyService,
    private formBuilder: FormBuilder,
    private pageScrollService: PageScrollService,
    @Inject(DOCUMENT) private document: any
  ) { }
}
