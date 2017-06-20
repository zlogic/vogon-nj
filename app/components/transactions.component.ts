import { Component, Inject } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { DOCUMENT } from '@angular/platform-browser';

import { PageScrollService, PageScrollInstance } from 'ng2-page-scroll';

import { AuthorizationService } from '../service/auth.service';
import { Transaction, TransactionComponent, TransactionsService } from '../service/transactions.service';
import { TagsService } from '../service/tags.service';

@Component({
  templateUrl: '../templates/components/transactions.pug'
})

export class TransactionsComponent {
  private editingTransaction: Transaction;
  filterForm: FormGroup;

  totalsByCurrency(transaction: Transaction): {currency: string; amount: any;}[] {
    var totals = [];
    var totalsCurrency = this.transactionsService.totalsByCurrency(transaction);
    for(var currency in totalsCurrency){
      totals.push({currency: currency, amount: totalsCurrency[currency]});
    }
    return totals;
  }
  addTransaction() {
    if(this.editingTransaction !== undefined) {
      this.editingTransaction = undefined;
      var prepare = () => {
        this.addTransaction();
      }
      this.transactionsService.update().subscribe(prepare, prepare);
      return;
    }
    var transaction = new Transaction();
    transaction.FinanceTransactionComponents = [];
    transaction.date = this.transactionsService.getDate();
    transaction.tags = [];
    transaction.type = this.transactionsService.defaultTransactionType.value;
    this.transactionsService.transactions.unshift(transaction);
    this.startEditing(transaction);
  }
  isEditing(transaction: Transaction): boolean {
    return this.editingTransaction === transaction;
  }
  startEditing(transaction: Transaction) {
    this.editingTransaction = transaction;
    if (transaction.id === undefined) {
      let pageScrollInstance: PageScrollInstance = PageScrollInstance.simpleInstance(this.document, '#transactionsStart');
      this.pageScrollService.start(pageScrollInstance);
    }
  }
  stopEditing() {
    this.editingTransaction = undefined;
  }
  duplicateTransaction(transaction: Transaction) {
    var newTransaction = transaction.clone();
    newTransaction.date = this.transactionsService.getDate();
    this.transactionsService.transactions.unshift(newTransaction);
    this.startEditing(newTransaction);
  }
  deleteTransaction(transaction: Transaction) {
    this.transactionsService.deleteTransaction(transaction).subscribe();
  }
  ngOnInit() {
    this.filterForm = this.formBuilder.group({
      'filterDescription': '',
      'filterDate': '',
      'filterTags': ''
    });
    this.filterForm.valueChanges.debounceTime(1000).subscribe(() => {
      this.transactionsService.update().subscribe();
    })
  }

  constructor(
    public transactionsService: TransactionsService,
    private authorizationService: AuthorizationService,
    public tagsService: TagsService,
    private formBuilder: FormBuilder,
    private pageScrollService: PageScrollService,
    @Inject(DOCUMENT) private document: any
  ) { }
}
