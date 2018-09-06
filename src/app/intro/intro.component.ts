import { Component } from '@angular/core';
import { ConfigurationService } from '../service/configuration.service';

@Component({
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.css']
})

export class IntroComponent {
  isAllowRegistration():boolean { return this.configurationService.isAllowRegistration(); }
  constructor(private configurationService: ConfigurationService) { }
}
