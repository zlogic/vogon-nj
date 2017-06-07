import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';

import { VogonMaterialModule } from './material.module';

import { AlertService } from './service/auth.service';

import { AppComponent } from './app.component';
import { TransactionsComponent } from './components/transactions.component';
import { AccountsComponent } from './components/accounts.component';
import { AnalyticsComponent } from './components/analytics.component';
import { UsersettingsComponent } from './components/usersettings.component';

const appRoutes: Routes = [
  { path: 'transactions', component: TransactionsComponent },
  { path: 'accounts', component: AccountsComponent },
  { path: 'analytics', component: AnalyticsComponent },
  { path: 'usersettings', component: UsersettingsComponent },
  { path: '**', redirectTo: 'transactions' }
];

@NgModule({
  imports: [ 
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes, { useHash: true }),
    VogonMaterialModule
  ],
  declarations: [
    AppComponent,
    TransactionsComponent,
    AccountsComponent,
    AnalyticsComponent,
    UsersettingsComponent
  ],
  providers: [
    AlertService
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
