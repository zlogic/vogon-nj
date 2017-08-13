import { Http, Response, Request, RequestOptions, RequestMethod, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';

export class VogonDBService {
  public request(request: Request): Observable<Response>{
    return Observable.of(new Response({
      body: {},
      status: null, headers: null, url: null, merge: null
    }));
  }
}