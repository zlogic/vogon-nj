import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { VogonMaterialModule } from './material.module';

import { AlertService, AuthorizationService, HTTPService } from './service/auth.service';

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
    HttpModule
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
    HTTPService
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
