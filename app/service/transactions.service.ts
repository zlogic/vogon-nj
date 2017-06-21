import { Injectable } from '@angular/core';
import { Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

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
  private readonly transactionTypes = [{name: __("Expense/income"), value: "expenseincome"}, {name: __("Transfer"), value: "transfer"}];
  readonly defaultTransactionType = this.transactionTypes[0];
  private currentPage: number = 0;
  private loadingNextPage: boolean = false;
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
    this.loadingNextPage = this.doUpdate.inProgress();
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
      .mergeMap((res: Response) => {
        var transaction = Transaction.fromJson(res.json());
        if (!this.updateTransactionLocal(transaction))
          return this.update();
        return Observable.of(res);
      })
      .catch(() => this.update());
  }
  removeTransaction(transaction: Transaction){
    this.transactions.unshift(transaction);
  }
  submitTransaction(transaction: Transaction) {
    transaction.date = dateToJson(transaction.date);
    return this.httpService.post("service/transactions", transaction)
      .mergeMap((res: Response) => {
        var transaction: Transaction = Transaction.fromJson(res.json());
        this.accountsService.update().subscribe();
        if (!this.updateTransactionLocal(transaction))
          return this.update();
        return Observable.of(res);
      })
      .catch(() => this.update());
  }
  deleteTransaction(transaction: Transaction): Observable<Response> {
    if (transaction === undefined || transaction.id === undefined)
      return this.update();
    var afterDeletion = (res: Response) => {
      // transactions will be reloaded after accounts are updated
      return this.accountsService.update();
    };
    return this.httpService.delete("service/transactions/transaction/" + transaction.id)
        .mergeMap(afterDeletion)
        .catch((err) => {
          afterDeletion(undefined).subscribe();
          return Observable.throw(err);
        });
  }
  getDate(): string {
    return dateToJson(new Date());
  }
  isExpenseIncomeTransaction(transaction: Transaction) {
    return transaction.type === this.transactionTypes[0].value;
  }
  isTransferTransaction(transaction: Transaction) {
    return transaction.type === this.transactionTypes[1].value;
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
          if (component.amount > 0 || this.isExpenseIncomeTransaction(transaction))
            totals[account.currency].positiveAmount += component.amount;
          else if (component.amount < 0)
            totals[account.currency].negativeAmount -= component.amount;
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
  applySort(column: string) {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortAsc = column === "description";
      this.sortColumn = column;
    }
    this.update().subscribe();
  }
  isLoadingNextPage(): boolean {
    return this.loadingNextPage;
  }
  isLastPage(): boolean {
    return this.lastPage;
  }
  constructor(private httpService: HTTPService, private authorizationService: AuthorizationService, private accountsService: AccountsService) {
    this.doUpdate = new UpdateHelper(() => {
      if (this.lastPage || !this.authorizationService.isAuthorized()) {
        if(!this.authorizationService.isAuthorized())
          this.reset();
        this.loadingNextPage = false;
        return Observable.of();
      }
      this.loadingNextPage = true;
      var params = {
        page: this.currentPage,
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
        .map((res: Response) => {
          this.loadingNextPage = false;
          if (res.json().length !== 0)
            this.transactions = this.transactions.concat(res.json().map(this.processReceivedTransaction));
          else
            this.lastPage = true;
          this.currentPage++;
          return res;
        })
        .catch((err) => {
          this.reset();
          this.lastPage = true;
          return Observable.throw(err);
        });
    });
    // transactions will be reloaded after accounts are updated
    this.accountsService.accountsObservable.subscribe(() => this.update().subscribe());
  }
}
