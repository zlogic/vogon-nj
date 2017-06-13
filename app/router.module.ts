import { NgModule } from '@angular/core';
import { RouterModule, Routes, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthService } from './service/auth.service';

import { LoginComponent } from './components/login.component';
import { TransactionsComponent } from './components/transactions.component';
import { AccountsComponent } from './components/accounts.component';
import { AnalyticsComponent } from './components/analytics.component';
import { UsersettingsComponent } from './components/usersettings.component';
import { IntroComponent } from './components/intro.component';

export class AuthGuard implements CanActivate {
  constructor(private router: Router, private authService: AuthService) { }
  canActivate(destination: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if(this.authService.isAuthorized()){
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
    RouterModule.forRoot(appRoutes, { useHash: true })
  ],
  exports: [
    RouterModule
  ],
  providers: [
    AuthGuard
  ]
})
export class VogonRoutingModule {}