import { Component } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material';

import { HTTPService } from '../service/http.service';
import { AccountsService, Account } from '../service/accounts.service';
import { TransactionsService } from '../service/transactions.service';
import { TagsService } from '../service/tags.service';
import { CurrencyService } from '../service/currency.service';
import { UserService } from '../service/user.service';
import { dateToJson } from '../utils';
import { I18nService } from '../service/i18n.service';

@Component({
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
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
  tagsChart: {name: string, value: number}[];
  balanceChart: {name: string, series: {name: Date, value: number}[]}[];
  balanceChartOptions = { elements: { line: { tension: 0 } } }
  selectedTabIndex: number = 0;

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
    this.updateSelectedTab();
  }
  private updateTagsChart() {
    this.tagsChart = [];
    var tagExpenses = this.reports[this.selectedCurrency].tagExpenses;
    if(tagExpenses !== undefined)
      tagExpenses.forEach((tagExpense: {tag: string, amount: number}) => {
        var amount = tagExpense.amount;
        if (amount !== 0) {
          this.tagsChart.push({name: tagExpense.tag, value: Math.abs(tagExpense.amount)});
        }
      });
  }
  private updateBalanceChart() {
    var data: {name: Date, value: number}[] = [];
    var accountGraph = this.reports[this.selectedCurrency].accountsBalanceGraph;
    if (accountGraph !== undefined)
      for (var date in accountGraph) {
        data.push({name: new Date(date), value: accountGraph[date]});
      }
    this.balanceChart = [{name: this.i18n.__("Balance"), series: data}]
  }
  updateSelectedTab() {
    if(this.selectedTabIndex === 0)
      this.updateTagsChart();
    else if(this.selectedTabIndex === 1)
      this.updateBalanceChart();
  }

  constructor(
    private httpService: HTTPService,
    public accountsService: AccountsService,
    public transactionsService: TransactionsService,
    public tagsService: TagsService,
    public currencyService: CurrencyService,
    public userService: UserService,
    private i18n: I18nService
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
