import { Http, Response, Request, RequestOptions, RequestMethod, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { Transaction } from '../transactions.service';

export class VogonDBService {

  private prepareStorage(): void {
    //TODO: remove this code and import data provided by the user
    let transaction = new Transaction();
    transaction.id = 0;
    transaction.date = '2017-01-01';
    transaction.description = 'Test transaction';
    transaction.tags = ['hello', 'world'];
    transaction.type = 'EXPENSEINCOME';
    transaction.version = 0;
    transaction.FinanceTransactionComponents = [];
    localStorage.setItem('transactions', JSON.stringify([transaction]))
  }

  private userService(request: Request): any {
    if(request.method === RequestMethod.Get)
      return { username: __('Local user'), version: 0}
  }

  private transactionsService(request: Request): Transaction[] {
    //TODO: only convert from JSON on load?
    if(request.method === RequestMethod.Get)
      return JSON.parse(localStorage.getItem('transactions'));
  }

  private convertResponse(data?: any): Response {
    return new Response({
      body: JSON.stringify(data),
      status: null, headers: null, url: null, merge: null
    });
  }

  public request(request: Request): Observable<Response> {
    var responseData;
    if (request.url === 'service/user')
      responseData = this.userService(request);
    else if (request.url.startsWith('service/accounts'))
      //TODO: replace this with a service, this is just to avoid errors
      responseData = [];
    else if (request.url.startsWith('service/analytics'))
      //TODO: replace this with a service, this is just to avoid errors
      responseData = [];
    else if (request.url.startsWith('service/transactions'))
      responseData = this.transactionsService(request);
    else
      return Observable.throw(this.convertResponse());
    return Observable.of(this.convertResponse(responseData));
  }
  constructor(){
    this.prepareStorage();
  }
}