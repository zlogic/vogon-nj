import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgForm } from '@angular/forms'

import { TransactionsService, Transaction, TransactionComponent } from '../service/transactions.service';
import { AccountsService, Account } from '../service/accounts.service';
import { TagsService } from '../service/tags.service';

@Component({
  selector: 'transaction-editor',
  templateUrl: '../templates/components/transactioneditor.html'
})

export class TransactionEditorComponent {
  @Input('transaction') transaction: Transaction;
  @Output() done = new EventEmitter();
  visibleAccounts: Account[];

  addTransactionComponent() {
    var component = new TransactionComponent();
    component.amount = 0;
    this.transaction.FinanceTransactionComponents.push(component);
  }
  deleteTransactionComponent(i: number) {
    this.transaction.FinanceTransactionComponents.splice(i, 1);
  }
  getCurrency(component: TransactionComponent): string{
    var selectedAccount = component.AccountId;
    if(selectedAccount === undefined){
      return undefined;
    }
    var account = this.accountsService.getAccount(selectedAccount)
    return account !== undefined ? account.currency : undefined;
  }
  submitEditing(transactionForm: NgForm) {
    if(!transactionForm.valid)
      return;
    this.tagsService.mergeTags(this.transaction.tags);
    this.transactionsService.submitTransaction(this.transaction).subscribe();
    this.done.emit();
  }
  cancelEditing() {
    if(this.transaction.id !== undefined)
      this.transactionsService.updateTransaction(this.transaction.id).subscribe();
    else
      this.transactionsService.update().subscribe();
    this.done.emit();
  }

  constructor(
    private transactionsService: TransactionsService,
    public accountsService: AccountsService,
    public tagsService: TagsService
  ) {
    this.visibleAccounts = this.accountsService.accounts.filter(function(account){
      return account.showInList;
    });
  }
}
