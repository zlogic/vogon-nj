import { Component, Inject } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { DOCUMENT } from '@angular/platform-browser';

import { PageScrollService, PageScrollInstance } from 'ng2-page-scroll';

import { HTTPService } from '../service/http.service';
import { AccountsService, Account } from '../service/accounts.service';
import { TransactionsService } from '../service/transactions.service';
import { TagsService } from '../service/tags.service';
import { CurrencyService } from '../service/currency.service';
import { UserService } from '../service/user.service';
import { dateToJson } from '../utils';

@Component({
  templateUrl: '../templates/components/analytics.pug'
})

export class AnalyticsComponent {
  startDate: Date;
  endDate: Date;
  tags: {tag: string, selected: boolean}[];
  accounts: {id: number, selected: boolean}[];
  transactionTypeEnabled = { transfer: false, income: true, expense: true };
  reports: any;
  selectedCurrency: string;
  currencies: string[];
  tagsChart: {data: number[], labels: string[]} = {data: [], labels: []};
  balanceChart: {data: number[], labels: string[]} = {data: [], labels: []};
  balanceChartOptions = { elements: { line: { tension: 0 } } }

  updateTags() {
    this.tags = [];
    this.tagsService.tags.forEach((tag: string) => {
      this.tags.push({tag: tag, selected: true});
    });
  }
  updateAccounts() {
    this.accounts = [];
    this.accountsService.accounts.forEach((account: Account) => {
      this.accounts.push({id: account.id, selected: true});
    });
  }
  selectAllTags() {
    this.tags.forEach((tag) => tag.selected = true);
  }
  deselectAllTags() {
    this.tags.forEach((tag) => tag.selected = false);
  }
  selectAllAccounts() {
    this.accounts.forEach((account) => account.selected = true);
  }
  deselectAllAccounts() {
    this.accounts.forEach((account) => account.selected = false);
  }
  buildReport() {
    var reportConfiguration = {
      earliestDate: dateToJson(this.startDate),
      latestDate: dateToJson(this.endDate),
      enabledTransferTransactions: this.transactionTypeEnabled.transfer,
      enabledIncomeTransactions: this.transactionTypeEnabled.income,
      enabledExpenseTransactions: this.transactionTypeEnabled.expense,
      selectedTags: <string[]>[],
      selectedAccounts: <number[]>[]
    };
    this.tags.forEach((tag) => {
      if(tag.selected)
        reportConfiguration.selectedTags.push(tag.tag)
    });
    this.accounts.forEach((account) => {
      if(account.selected)
        reportConfiguration.selectedAccounts.push(account.id);
    });
    this.httpService.post("service/analytics", reportConfiguration)
      .subscribe((res) => {
        this.reports = res.json();
        this.updateCurrencies();
        if(this.reports !== undefined) {
          let pageScrollInstance: PageScrollInstance = PageScrollInstance.simpleInstance(this.document, '#report');
          this.pageScrollService.start(pageScrollInstance);
        }
      });
  }
  updateCurrencies() {
    this.currencies = Object.keys(this.reports);
    this.selectedCurrency = this.currencies.length > 0 ? this.currencies[0] : undefined;
    this.currencyChanged();
  }
  getReportTransactions() {
    return this.reports[this.selectedCurrency].financeTransactions;
  }
  getReportTagExpenses() {
    return this.reports[this.selectedCurrency].tagExpenses;
  }
  currencyChanged() {
    this.updateTagsChart();
    this.updateBalanceChart();
  }
  updateTagsChart() {
    var data: number[] = [];
    var labels: string[] = [];
    var tagExpenses = this.reports[this.selectedCurrency].tagExpenses;
    if(tagExpenses !== undefined)
      tagExpenses.forEach(function (tagExpense: {tag: string, amount: number}) {
        var amount = tagExpense.amount;
        if (amount !== 0) {
          data.push(tagExpense.amount);
          labels.push(tagExpense.tag);
        }
      });
    this.tagsChart.data = data;
    this.tagsChart.labels = labels;
  }
  updateBalanceChart() {
    var data: number[] = [];
    var labels: string[] = [];
    var accountGraph = this.reports[this.selectedCurrency].accountsBalanceGraph;
    if (accountGraph !== undefined)
      for (var date in accountGraph) {
        data.push(accountGraph[date]);
        labels.push(date);
      }
    this.balanceChart.data = data;
    this.balanceChart.labels = labels;
  }

  constructor(
    private httpService: HTTPService,
    public accountsService: AccountsService,
    public transactionsService: TransactionsService,
    public tagsService: TagsService,
    public currencyService: CurrencyService,
    public userService: UserService,
    private pageScrollService: PageScrollService,
    @Inject(DOCUMENT) private document: any
  ) {
    let currentTime = new Date();
    this.startDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1);
    this.endDate = new Date((new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 1)).getTime() - 1);

    this.tagsService.tagsObservable.subscribe(() => this.updateTags());
    this.accountsService.accountsObservable.subscribe(() => this.updateAccounts());
    this.updateTags();
    this.updateAccounts();
  }
 }
