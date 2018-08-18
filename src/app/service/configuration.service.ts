import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';

@Injectable()
export class ConfigurationService {
  private allowRegistration: boolean = false;

  isAllowRegistration(): boolean{
    return this.allowRegistration;
  }

  constructor(private http: Http) {
    this.http.get('configuration').subscribe((res: Response) => {
      this.allowRegistration = res.json().allowRegistration;
    });
  }
}