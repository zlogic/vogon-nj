import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService, AuthorizationService } from './service/auth.service';

@Component({
  selector: 'vogon-app',
  templateUrl: './templates/app.pug'
})

export class AppComponent {
  constructor(
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private router: Router
  ){ }
  
  isLoading(): boolean { 
    return this.alertService.isLoading();
  }

  isAuthorized(): boolean {
    return this.authorizationService.isAuthorized();
  }

  private navigateToLogin() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.authorizationService.logout().
      subscribe(
        () => this.navigateToLogin(),
        (error) => this.navigateToLogin()
      );
  }
}
