import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { AuthorizationService } from './service/auth.service';
import { AlertService } from './service/http.service';
import { UpdateService } from './service/update.service';
import { UserService } from './service/user.service';

@Component({
  selector: 'vogon-app',
  templateUrl: './templates/app.pug',
  styleUrls: ['./style.scss'],
  encapsulation: ViewEncapsulation.None
})

export class AppComponent {
  constructor(
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private userService: UserService,
    private router: Router,
    private updateService: UpdateService
  ){ }
  
  getAppTitle(): string {
    if(this.authorizationService.isAuthorized()){
      return __("Vogon for {0}").replace('{0}', this.userService.username);
    }
    return __("Vogon");
  }

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
