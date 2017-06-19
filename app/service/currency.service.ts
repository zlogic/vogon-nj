import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

export class Currency {
  currencyCode: string;
  displayName: string;
}

@Injectable()
export class CurrencyService {
  private currencies = require('country-data/data/currencies.json');

  findCurrency(currencyCode: string) {
    var result = this.currencies.filter(
        function (currency: any) {
          return currency.code === currencyCode;
        });
    if (result.length > 0)
      return result[0];
  }
  constructor(){
    this.currencies = require('country-data/data/currencies.json')
    .map((currency: any) => {
      return { currencyCode: currency.code, displayName: currency.name };
    }).sort(function(a: Currency, b: Currency){
      return a.displayName.localeCompare(b.displayName);
    }).filter(function(currency: Currency){
      //TODO: migrate to a better currency code library?
      //This excludes a really ugly currency name
      return currency.currencyCode !== "USS";
    });
  }
}