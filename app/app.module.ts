import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { APP_BASE_HREF } from '@angular/common';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { VogonMaterialModule } from './material.module';

import { AuthorizationService } from './service/auth.service';
import { AlertService, HTTPService } from './service/http.service';
import { TransactionsService } from './service/transactions.service';
import { AccountsService } from './service/accounts.service';
import { CurrencyService } from './service/currency.service';
import { TagsService } from './service/tags.service';
import { UserService } from './service/user.service';
import { UpdateService } from './service/update.service';
import { ConfigurationService } from './service/configuration.service';

import { AppComponent } from './app.component';
import { VogonRoutingModule, getBaseHref } from './router.module';

import { LoginComponent } from './components/login.component';
import { TransactionsComponent } from './components/transactions.component';
import { AccountsComponent } from './components/accounts.component';
import { AnalyticsComponent } from './components/analytics.component';
import { UsersettingsComponent } from './components/usersettings.component';
import { IntroComponent } from './components/intro.component';
import { TransactionEditorComponent } from './components/transactioneditor.component';
import { TagsInputComponent } from './components/tagsinput.component';

@NgModule({
  imports: [ 
    BrowserModule,
    BrowserAnimationsModule,
    VogonRoutingModule,
    VogonMaterialModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    InfiniteScrollModule,
    NgxChartsModule
  ],
  declarations: [
    AppComponent,
    LoginComponent,
    TransactionsComponent,
    TransactionEditorComponent,
    TagsInputComponent,
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
    AccountsService,
    CurrencyService,
    TagsService,
    UserService,
    UpdateService,
    ConfigurationService,
    { provide: APP_BASE_HREF, useFactory: getBaseHref }
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
