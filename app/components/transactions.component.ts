import { Component, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';

import { PageScrollService, PageScrollInstance } from 'ng2-page-scroll';

import { AuthorizationService } from '../service/auth.service';
import { Transaction, TransactionComponent, TransactionsService } from '../service/transactions.service';

@Component({
  templateUrl: '../templates/components/transactions.pug'
})

export class TransactionsComponent {
  private editingTransaction: Transaction;

  totalsByCurrency(transaction: Transaction): {currency: string; amount: any;}[] {
    var totals = [];
    var totalsCurrency = this.transactionsService.totalsByCurrency(transaction);
    for(var currency in totalsCurrency){
      totals.push({currency: currency, amount: totalsCurrency[currency]});
    }
    return totals;
  }
  addTransaction() {
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
  applyFilter() {
    //TODO: implement a proper filter with debounceTime: https://stackoverflow.com/a/34656612/2401011
    /*
    $scope.filterDirty = true;
    if ($scope.filterTimer === undefined) {
      $scope.filterTimer = $interval(function () {
        $scope.filterDirty = false;
        TransactionsService.update().then(function () {
          $scope.filterTimer = undefined;
          if ($scope.filterDirty)
            $scope.applyFilter();
        });
      }, 1000, 1);
    }
    */
  }

  constructor(
    public transactionsService: TransactionsService,
    private authorizationService: AuthorizationService,
    private pageScrollService: PageScrollService,
    @Inject(DOCUMENT) private document: any
  ) { }
}
