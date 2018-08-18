import { Component, ViewEncapsulation, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MediaMatcher } from '@angular/cdk/layout';
import { AuthorizationService } from './service/auth.service';
import { AlertService } from './service/http.service';
import { UpdateService } from './service/update.service';
import { UserService } from './service/user.service';

@Component({
  selector: 'vogon-app',
  templateUrl: './templates/app.html',
  styleUrls: ['./style.scss'],
  encapsulation: ViewEncapsulation.None
})

export class AppComponent implements OnDestroy {
  private mobileQuery: MediaQueryList;
  private mobileQueryListener: () => void;

  constructor(
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private userService: UserService,
    private router: Router,
    private updateService: UpdateService,
    private media: MediaMatcher,
    private changeDetectorRef: ChangeDetectorRef
  ){
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this.mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this.mobileQueryListener);
  }
  
  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this.mobileQueryListener);
  }

  getUsername(): string {
      return this.userService.username;
  }

  isLoading(): boolean { 
    return this.alertService.isLoading();
  }

  isAuthorized(): boolean {
    return this.authorizationService.isAuthorized();
  }

  isSmallScreen(): boolean {
    return this.mobileQuery.matches;
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
