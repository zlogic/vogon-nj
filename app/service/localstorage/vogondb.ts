import { Response, Request } from '@angular/http';
import { Observable } from 'rxjs/Observable';

export interface VogonDB {
  request(request: Request): Observable<Response>;
}
