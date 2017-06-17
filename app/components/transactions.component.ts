import { Component } from '@angular/core';

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
  addTransaction = function () {
    var transaction = new Transaction();
    transaction.FinanceTransactionComponents = [];
    transaction.date = this.transactionsService.getDate();
    transaction.tags = [];
    transaction.type = this.transactionsService.defaultTransactionType.value;
    this.transactionsService.transactions.unshift(transaction);
    this.startEditing(transaction);
  }
  startEditing(transaction: Transaction) {
    this.editingTransaction = transaction;
    if (transaction.id === undefined) {
      //TODO: scroll to edited item https://stackoverflow.com/a/43553080/2401011
      /*
      var transactionsTableStart = $("div[id='transactionsTableStart']");
      var docViewTop = $(window).scrollTop();
      var docViewBottom = docViewTop + $(window).height();
      if (transactionsTableStart.position().top < docViewTop || transactionsTableStart.position().top > docViewBottom)
        $('html, body').animate({scrollTop: transactionsTableStart.position().top}, "slow");
      */
    }
  }
  duplicateTransaction(transaction: Transaction) {
    var newTransaction = transaction.clone();
    newTransaction.date = this.transactionsService.getDate();
    newTransaction.FinanceTransactionComponents.forEach(function (component: TransactionComponent) {
      component.id = undefined;
      component.version = undefined;
    });
    this.transactionsService.removeTransaction(newTransaction);
    this.startEditing(newTransaction);
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

  constructor(public transactionsService: TransactionsService, private authorizationService: AuthorizationService) {
    this.authorizationService.authorizedObservable().subscribe(() => this.transactionsService.update().subscribe());
    this.transactionsService.update().subscribe();
  }
}
