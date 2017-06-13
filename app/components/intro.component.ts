import { Component } from '@angular/core';

@Component({
  templateUrl: '../templates/components/intro.pug'
})

export class IntroComponent {
  isAllowRegistration():boolean { return allowRegistration; }
}
