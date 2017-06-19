import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, Validators, FormBuilder, FormArray } from '@angular/forms';
import { Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { TransactionsService, Transaction, TransactionComponent } from '../service/transactions.service';
import { AccountsService, Account } from '../service/accounts.service';
import { TagsService } from '../service/tags.service';
import { HTTPService } from '../service/http.service';

@Component({
  selector: 'transaction-editor',
  templateUrl: '../templates/components/transactioneditor.pug'
})

export class TransactionEditorComponent implements OnInit {
  @Input('transaction') transaction: Transaction;
  @Output() done = new EventEmitter();
  transactionForm: FormGroup;
  visibleAccounts: Account[];

  getComponentsGroup() {
    return <FormArray>this.transactionForm.controls['FinanceTransactionComponents'];
  }  

  private createComponentControl(component: TransactionComponent) {
    return this.formBuilder.group({
      'id': [component.id],
      'version': [component.version],
      'AccountId': [component.AccountId, Validators.required],
      'amount': [component.amount.toFixed(2), [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]]
    });
  }
  addTransactionComponent(component?: TransactionComponent) {
    if(component === undefined) {
      component = new TransactionComponent();
      component.amount = 0;
    }
    this.getComponentsGroup().push(this.createComponentControl(component));
  }
  deleteTransactionComponent(i: number) {
    this.getComponentsGroup().removeAt(i);
  }
  getCurrency(i: number): string{
    var selectedAccount = (<FormArray>this.getComponentsGroup().controls[i]).controls['AccountId'].value;
    if(selectedAccount === undefined){
      return undefined;
    }
    var account = this.accountsService.getAccount(selectedAccount)
    return account !== undefined ? account.currency : undefined;
  }
  submitEditing() {
    if(!this.transactionForm.valid)
      return;
    this.tagsService.mergeTags(this.transaction.tags);
    var updatedTransaction = Transaction.fromJson(this.transactionForm.value);
    updatedTransaction.id = this.transaction.id;
    updatedTransaction.version = this.transaction.version;
    updatedTransaction.FinanceTransactionComponents.forEach(function(component){
      if(component.id === null || component.id === undefined)
        delete component.id;
      if(component.version === null || component.version === undefined)
        delete component.version;
    });
    this.transactionsService.submitTransaction(updatedTransaction).subscribe();
    this.done.emit();
  }
  cancelEditing() {
    if(this.transaction.id !== undefined)
      this.transactionsService.updateTransaction(this.transaction.id).subscribe();
    this.done.emit();
  }

  ngOnInit() {
    this.transactionForm = this.formBuilder.group({
      'description': [this.transaction.description, Validators.required],
      'type': [this.transaction.type, Validators.required],
      'date': [this.transaction.date, Validators.required],
      'tags': [this.transaction.tags],
      'FinanceTransactionComponents': this.formBuilder.array([])
    });
    this.transaction.FinanceTransactionComponents.forEach((component) => this.addTransactionComponent(component));
    this.visibleAccounts = this.accountsService.accounts.filter(function(account){
      return account.showInList;
    });
  }

  constructor(
    private formBuilder: FormBuilder,
    private transactionsService: TransactionsService,
    public accountsService: AccountsService,
    public tagsService: TagsService
  ) { }
}
