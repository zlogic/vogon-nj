import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';

import { VogonMaterialModule } from './material.module';

import { AuthorizationService } from './service/auth.service';
import { AlertService, HTTPService } from './service/http.service';
import { TransactionsService } from './service/transactions.service';
import { AccountsService } from './service/accounts.service';

import { AppComponent } from './app.component';
import { VogonRoutingModule } from './router.module';

import { LoginComponent } from './components/login.component';
import { TransactionsComponent } from './components/transactions.component';
import { AccountsComponent } from './components/accounts.component';
import { AnalyticsComponent } from './components/analytics.component';
import { UsersettingsComponent } from './components/usersettings.component';
import { IntroComponent } from './components/intro.component';

@NgModule({
  imports: [ 
    BrowserModule,
    BrowserAnimationsModule,
    VogonRoutingModule,
    VogonMaterialModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    InfiniteScrollModule
  ],
  declarations: [
    AppComponent,
    LoginComponent,
    TransactionsComponent,
    AccountsComponent,
    AnalyticsComponent,
    UsersettingsComponent,
    IntroComponent
  ],
  providers: [
    AlertService,
    AuthorizationService,
    HTTPService,
    TransactionsService,
    AccountsService
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
