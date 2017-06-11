import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { VogonMaterialModule } from './material.module';

import { AlertService, AuthService } from './service/auth.service';

import { AppComponent } from './app.component';
import { VogonRoutingModule } from './router.module';

import { LoginComponent } from './components/login.component';
import { TransactionsComponent } from './components/transactions.component';
import { AccountsComponent } from './components/accounts.component';
import { AnalyticsComponent } from './components/analytics.component';
import { UsersettingsComponent } from './components/usersettings.component';

@NgModule({
  imports: [ 
    BrowserModule,
    BrowserAnimationsModule,
    VogonRoutingModule,
    VogonMaterialModule,
    FormsModule
  ],
  declarations: [
    AppComponent,
    LoginComponent,
    TransactionsComponent,
    AccountsComponent,
    AnalyticsComponent,
    UsersettingsComponent
  ],
  providers: [
    AlertService,
    AuthService
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
