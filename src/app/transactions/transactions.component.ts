import { Component, ViewChild, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Sort, PageEvent } from '@angular/material';
import { MediaMatcher } from '@angular/cdk/layout';
import { debounceTime } from 'rxjs/operators';

import { Transaction, TransactionsService } from '../service/transactions.service';
import { TagsService } from '../service/tags.service';

@Component({
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})

export class TransactionsComponent {
  @ViewChild('filterForm') private filterForm: NgForm;
  private mobileQuery: MediaQueryList;
  private mobileQueryListener: () => void;

  editingTransaction: Transaction;

  private displayedColumns: string[] = ['description', 'date', 'accounts', 'amount', 'menu'];

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
      this.transactionsService.update(true).subscribe(prepare, prepare);
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
        this.transactionsService.update(true).subscribe();
    });
  }
  sortData(sort: Sort) {
    this.transactionsService.sortColumn = sort.active;
    this.transactionsService.sortAsc = sort.direction === "asc";
    this.transactionsService.update(true).subscribe();
  }
  loadPage(page: PageEvent) {
    this.transactionsService.pageIndex = page.pageIndex;
    this.transactionsService.pageSize = page.pageSize;
    this.transactionsService.update(false).subscribe();
  }
  getSortDirection() {
    return this.transactionsService.sortAsc ? "asc" : "desc";
  }
  getSortColumn() {
    return this.transactionsService.sortColumn;
  }

  isSmallScreen(): boolean {
    return this.mobileQuery.matches;
  }

  getDisplayedColumns(): string[] {
    if(this.mobileQuery.matches)
      return ['summary'];
    return this.displayedColumns;
  }

  constructor(
    public transactionsService: TransactionsService,
    public tagsService: TagsService,
    private media: MediaMatcher,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this.mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this.mobileQueryListener);
  }
  
  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this.mobileQueryListener);
  }
}
