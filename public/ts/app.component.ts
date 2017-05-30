import { Component } from '@angular/core';

@Component({
  selector: 'vogon-app',
  template: `<h1>Hello {{name}}</h1>`
})
export class AppComponent { name = 'Angular'; }
