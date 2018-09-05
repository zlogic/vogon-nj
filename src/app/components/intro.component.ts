import { Component } from '@angular/core';
import { ConfigurationService } from '../service/configuration.service';

@Component({
  templateUrl: '../templates/components/intro.html'
})

export class IntroComponent {
  isAllowRegistration():boolean { return this.configurationService.isAllowRegistration(); }
  constructor(private configurationService: ConfigurationService) { }
}