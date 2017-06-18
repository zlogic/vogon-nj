import { Injectable } from '@angular/core';
import { Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { AuthorizationService } from './auth.service';
import { HTTPService, UpdateHelper } from './http.service';
import { AccountsService, Account } from './accounts.service'
import { dateToJson } from '../utils';
import { tagsToJson } from './tags.service';

export class TransactionComponent {
  id: number;
  version: number;
  AccountId: number;
  amount: number;
  clone(): TransactionComponent {
    var clone = new TransactionComponent();
    clone.AccountId = this.AccountId;
    clone.amount = this.amount;
    return clone
  }
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
    clone.date = this.date;
    clone.type = this.type;
    clone.tags = this.tags.map(function(tag){ return tag; });
    clone.FinanceTransactionComponents = this.FinanceTransactionComponents.map(function(component){ return component.clone(); });
    return clone;
  }
}

@Injectable()
export class TransactionsService {
  transactions: Transaction[] = [];
  private readonly transactionTypes = [{name: __("Expense/income"), value: "expenseincome"}, {name: __("Transfer"), value: "transfer"}];
  private readonly defaultTransactionType = this.transactionTypes[0];
  private currentPage: number = 0;
  private loadingNextPage: boolean = false;
  private lastPage: boolean = false;
  private sortColumn: string = "date";
  private sortAsc: boolean = false;
  private filterDescription: string = undefined;
  private filterDate: string = undefined;
  private filterTags: string = undefined;
  private doUpdate: UpdateHelper;
  reset() {
    this.currentPage = 0;
    this.transactions = [];
    this.lastPage = false;
    this.loadingNextPage = this.doUpdate.inProgress();
  }
  private processReceivedTransaction(transaction: Transaction): Transaction {
    transaction.date = dateToJson(new Date(transaction.date));
    return transaction;
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
  private updateTransaction(id: number): Observable<Response> {
    if (id === undefined)
      return this.update();
    return this.httpService.get("service/transactions/transaction/" + id)
      .map((res: Response) => {
        var transaction: Transaction = Object.assign(new Transaction(), res.json());
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
      .map((res: Response) => {
        var transaction: Transaction = Object.assign(new Transaction(), res.json());
        this.accountsService.update();
        if (!this.updateTransactionLocal(transaction))
          return this.update();
        return Observable.of(res);
      })
      .catch(() => this.update());
  }
  deleteTransaction(transaction: Transaction): Observable<Response> {
    if (transaction === undefined || transaction.id === undefined)
      return this.update();
    var afterDeletion = () => {
      this.accountsService.update();
      return this.update();
    };
    return this.httpService.delete("service/transactions/transaction/" + transaction.id)
        .map(afterDeletion)
        .catch((err) => {
          afterDeletion();
          return err;
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
    this.update();
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
        return Observable.throw(undefined);
      }
      this.loadingNextPage = true;
      var params = {
        page: this.currentPage,
        sortColumn: this.sortColumn,
        sortDirection: this.sortAsc ? "ASC" : "DESC"
      };
      if (this.filterDate !== undefined && this.filterDate !== null && this.filterDate !== "")
        params['filterDate'] = dateToJson(this.filterDate);
      if (this.filterDescription !== undefined && this.filterDescription !== "")
        params['filterDescription'] = this.filterDescription;
      if (this.filterTags !== undefined) {
        var tags = tagsToJson(this.filterTags);
        if (tags.length > 0)
          params['filterTags'] = JSON.stringify(tags);
      }
      return this.httpService.get("service/transactions/?" + this.httpService.encodeForm(params))
        .map((res: Response) => {
          this.loadingNextPage = false;
          if (res.json().length !== 0)
            this.transactions = this.transactions.concat(res.json().map(this.processReceivedTransaction));
          else
            this.lastPage = true;
          this.currentPage++;
        }, function () {
          this.reset();
          this.lastPage = true;
        });
    });
    this.authorizationService.authorizationObservable.subscribe(() => this.update().subscribe());
    this.accountsService.accountsObservable.subscribe(() => this.update().subscribe());
  }
}
