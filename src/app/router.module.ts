import { NgModule, Injectable } from '@angular/core';
import { RouterModule, Routes, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthorizationService } from './service/auth.service';

import { LoginComponent } from './login/login.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { AccountsComponent } from './accounts/accounts.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { UsersettingsComponent } from './usersettings/usersettings.component';
import { IntroComponent } from './intro/intro.component';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private authorizationService: AuthorizationService) { }
  canActivate(destination: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if(this.authorizationService.isAuthorized()){
      if(destination.component === LoginComponent) {
        this.router.navigate(['/transactions']);
        return false;
      }
      return true;
    } else {
      if(destination.component === LoginComponent) {
        return true;
      }
      this.router.navigate(['/login']);
      return false;
    }
  }
}

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [AuthGuard] },
  { path: 'transactions', component: TransactionsComponent, canActivate: [AuthGuard] },
  { path: 'accounts', component: AccountsComponent, canActivate: [AuthGuard] },
  { path: 'analytics', component: AnalyticsComponent, canActivate: [AuthGuard] },
  { path: 'usersettings', component: UsersettingsComponent, canActivate: [AuthGuard] },
  { path: 'intro', component: IntroComponent },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes)
  ],
  exports: [
    RouterModule
  ],
  providers: [
    AuthGuard
  ]
})
export class VogonRoutingModule {}

export function getBaseHref() {
  // Use the same base URL as the HTML page. Admin can change base href, for example when using URL rewrites.
  return document.querySelector('base').href;
}
