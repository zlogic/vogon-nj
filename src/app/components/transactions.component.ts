import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

import { Transaction, TransactionsService } from '../service/transactions.service';
import { TagsService } from '../service/tags.service';

@Component({
  templateUrl: '../templates/components/transactions.html'
})

export class TransactionsComponent {
  @ViewChild('filterForm') filterForm: NgForm;
  editingTransaction: Transaction;

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
    transaction.type = this.transactionsService.defaultTransactionType;
    this.transactionsService.transactions.unshift(transaction);
    this.startEditing(transaction);
  }
  isEditing(): boolean {
    return this.editingTransaction !== undefined;
  }
  startEditing(transaction: Transaction) {
    this.editingTransaction = transaction;
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
    this.filterForm.valueChanges.pipe(debounceTime(1000)).subscribe(() => {
      if(this.filterForm.dirty)
        this.transactionsService.update().subscribe();
    });
  }

  constructor(
    public transactionsService: TransactionsService,
    public tagsService: TagsService
  ) { }
}
