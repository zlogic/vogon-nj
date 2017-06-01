import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AlertService } from './service/auth.service';

import { AppComponent } from './app.component';
import { NotificationComponent } from './components/notification.component';

@NgModule({
  imports: [ BrowserModule ],
  declarations: [ AppComponent, NotificationComponent ],
  providers: [ AlertService ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
