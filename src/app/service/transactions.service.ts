import { Injectable } from '@angular/core';
import { Response } from '@angular/http';
import { Observable, of, throwError } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';

import { AuthorizationService } from './auth.service';
import { HTTPService, UpdateHelper } from './http.service';
import { AccountsService, Account } from './accounts.service'
import { dateToJson } from '../utils';

export class TransactionComponent {
  id: number;
  version: number;
  AccountId: number;
  amount: number;
  clone(): TransactionComponent {
    var clone = new TransactionComponent();
    clone.AccountId = this.AccountId;
    clone.amount = this.amount;
    return clone;
  }
  static fromJson(json: any): TransactionComponent {
    var component = new TransactionComponent();
    for(var property in json)
      component[property] = json[property];
    return component;
  }
  constructor(){ }
}

export class Transaction {
  id: number;
  version: number;
  description: string;
  date: string;
  type: string;
  tags: string[];
  FinanceTransactionComponents: TransactionComponent[];
  clone(): Transaction {
    var clone = new Transaction();
    clone.description = this.description;
    clone.date = this.date;
    clone.type = this.type;
    clone.tags = this.tags.map(function(tag){ return tag; });
    clone.FinanceTransactionComponents = this.FinanceTransactionComponents.map(function(component){ return component.clone(); });
    return clone;
  }
  static fromJson(json: any): Transaction {
    var transaction = new Transaction();
    for(var property in json)
      transaction[property] = json[property];
    if(json.FinanceTransactionComponents !== undefined)
      transaction.FinanceTransactionComponents = json.FinanceTransactionComponents.map(function(component: any) {
        return TransactionComponent.fromJson(component);
      })
    return transaction;
  }
  constructor(){ }
}

@Injectable()
export class TransactionsService {
  transactions: Transaction[] = [];
  readonly defaultTransactionType = "expenseincome";
  private currentPage: number = 0;
  private lastPage: boolean = false;
  sortColumn: string = "date";
  sortAsc: boolean = false;
  filterDescription: string = undefined;
  filterDate: Date = undefined;
  filterTags: string[] = [];
  private doUpdate: UpdateHelper;
  reset() {
    this.currentPage = 0;
    this.transactions = [];
    this.lastPage = false;
  }
  private processReceivedTransaction(transactionJson: any): Transaction {
    transactionJson.date = dateToJson(new Date(transactionJson.date));
    return Transaction.fromJson(transactionJson);
  }
  update(): Observable<Response> {
    this.reset();
    return this.doUpdate.update();
  }
  nextPage() {
    this.doUpdate.update().subscribe();
  }
  private updateTransactionLocal(data: Transaction) {
    var found = false;
    this.transactions.forEach(
        (transaction, i) => {
          if (transaction.id === data.id) {
            this.transactions[i] = this.processReceivedTransaction(data);
            found = true;
          }
        });
    return found;
  }
  updateTransaction(id: number): Observable<Response> {
    if (id === undefined)
      return this.update();
    return this.httpService.get("service/transactions/transaction/" + id)
      .pipe(
        mergeMap((res: Response) => {
          var transaction = Transaction.fromJson(res.json());
          if (!this.updateTransactionLocal(transaction))
            this.reset();// infinite scroll will automatically call update()
          return of(res);
        }),
        catchError(() => this.update())
      );
  }
  removeTransaction(transaction: Transaction){
    this.transactions.unshift(transaction);
  }
  submitTransaction(transaction: Transaction) {
    transaction.date = dateToJson(transaction.date);
    return this.httpService.post("service/transactions", transaction)
      .pipe(
        mergeMap((res: Response) => {
          var transaction: Transaction = Transaction.fromJson(res.json());
          this.accountsService.update().subscribe();
          if (!this.updateTransactionLocal(transaction))
            this.reset();// infinite scroll will automatically call update()
          return of(res);
        }),
        catchError(() => this.update())
      );
  }
  deleteTransaction(transaction: Transaction): Observable<Response> {
    if (transaction === undefined || transaction.id === undefined)
      return this.update();
    var afterDeletion = (res: Response) => {
      // transactions will be reloaded after accounts are updated
      return this.accountsService.update();
    };
    return this.httpService.delete("service/transactions/transaction/" + transaction.id)
        .pipe(
          mergeMap(afterDeletion),
          catchError((err) => {
            afterDeletion(undefined).subscribe();
            return throwError(err);
          })
        );
  }
  getDate(): string {
    return dateToJson(new Date());
  }
  isExpenseIncomeTransaction(transaction: Transaction) {
    return transaction.type === 'expenseincome';
  }
  isTransferTransaction(transaction: Transaction) {
    return transaction.type === 'transfer';
  }
  getAccounts(transaction: Transaction, predicate: (tc: TransactionComponent) => boolean) {
    var accounts: Account[] = [];
    transaction.FinanceTransactionComponents.forEach(
        (component) => {
          var account = this.accountsService.getAccount(component.AccountId);
          if (account !== undefined && predicate(component) && !accounts.some(function (checkAccount: Account) {
            return checkAccount.id === account.id;
          }))
            accounts.unshift(account);
        });
    return accounts;
  }
  private fromAccountsPredicate(component: TransactionComponent): boolean {
    return component.amount < 0;
  }
  private toAccountsPredicate(component: TransactionComponent): boolean {
    return component.amount > 0;
  }
  private allAccountsPredicate() {
    return true;
  }
  getTotalsByCurrency(transaction: Transaction) {
    var totals = {};
    transaction.FinanceTransactionComponents.forEach(
        (component) => {
          var account = this.accountsService.getAccount(component.AccountId);
          if (account === undefined)
            return;
          if (totals[account.currency] === undefined)
            totals[account.currency] = {positiveAmount: 0, negativeAmount: 0};
          var amount = +component.amount;
          if (amount > 0 || this.isExpenseIncomeTransaction(transaction))
            totals[account.currency].positiveAmount += amount;
          else if (amount < 0)
            totals[account.currency].negativeAmount -= amount;
        });
    return totals;
  }
  isAmountOk(transaction: Transaction): boolean {
    if (this.isExpenseIncomeTransaction(transaction))
      return true;
    if (this.isTransferTransaction(transaction)) {
      var totals = this.getTotalsByCurrency(transaction);
      var totalsCount = 0;
      for (var currency in totals) {
        if (totalsCount > 0)
          return true;
        totalsCount++;
      }
      for (var currency in totals) {
        var total = totals[currency];
        if (total.positiveAmount !== total.negativeAmount)
          return false;
      }
      return true;
    } else
      return false;
  }
  totalsByCurrency(transaction: Transaction) {
    var totals = {};
    var totalsData = this.getTotalsByCurrency(transaction);
    for (var currency in totalsData) {
      var total = totalsData[currency];
      if (this.isExpenseIncomeTransaction(transaction))
        totals[currency] = total.positiveAmount;
      else if (this.isTransferTransaction(transaction))
        totals[currency] = total.positiveAmount > total.negativeAmount ? total.positiveAmount : total.negativeAmount;
    }
    return totals;
  }
  isLoadingNextPage(): boolean {
    return this.doUpdate.inProgress();
  }
  isLastPage(): boolean {
    return this.lastPage;
  }
  constructor(private httpService: HTTPService, private authorizationService: AuthorizationService, private accountsService: AccountsService) {
    this.doUpdate = new UpdateHelper(() => {
      if (this.lastPage || !this.authorizationService.isAuthorized()) {
        if(!this.authorizationService.isAuthorized())
          this.reset();
        return;
      }
      var params = {
        page: this.currentPage++,
        sortColumn: this.sortColumn,
        sortDirection: this.sortAsc ? "ASC" : "DESC"
      };
      if (this.filterDate !== undefined && this.filterDate !== null)
        params['filterDate'] = dateToJson(this.filterDate);
      if (this.filterDescription !== undefined && this.filterDescription !== "")
        params['filterDescription'] = this.filterDescription;
      if (this.filterTags !== undefined && this.filterTags !== null) {
        if (this.filterTags.length > 0)
          params['filterTags'] = JSON.stringify(this.filterTags);
      }
      return this.httpService.get("service/transactions/?" + this.httpService.encodeForm(params))
        .pipe(
          map((res: Response) => {
            if (res.json().length !== 0) {
              this.transactions = this.transactions.concat(res.json().map(this.processReceivedTransaction));
            } else {
              this.lastPage = true;
            }
            return res;
          }),
          catchError((err) => {
            this.reset();
            this.lastPage = true;
            return throwError(err);
          })
        );
    });
    // transactions will be reloaded after accounts are updated
    this.accountsService.accountsObservable.subscribe(() => this.update().subscribe());
  }
}