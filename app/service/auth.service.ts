import { Injectable } from '@angular/core';
import { MdSnackBar } from '@angular/material';

@Injectable()
export class AlertService {
  private loadingRequests: number;

  constructor(private snackBar: MdSnackBar) {
    this.loadingRequests = 0;
  }

  addAlert(message: string) {
    this.snackBar.open(message, require('../templates/components/snackbar.pug'));
  }

  startLoadingRequest() {
    this.loadingRequests++;
  }

  endLoadingRequest(){
    this.loadingRequests--;
  }

  isLoading():boolean {
    return this.loadingRequests > 0;
  }
}

@Injectable()
export class AuthService {
  constructor() {}
  
  isAuthorized():boolean {
    //TODO: implement real check here
    return false;
  }
}
