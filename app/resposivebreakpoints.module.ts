import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { BREAKPOINTS, DEFAULT_BREAKPOINTS } from '@angular/flex-layout';

const APP_BREAKPOINTS = [{
  alias: 'smallscreen',
  mediaQuery: 'screen and (max-width: 750px)',
  overlapping: false
}];

export const CustomBreakPointsProvider = { 
  provide: BREAKPOINTS,
  useValue: APP_BREAKPOINTS
};

@NgModule({
  imports : [
    FlexLayoutModule,
  ],
  providers: [
    CustomBreakPointsProvider,
  ]
})
export class ResponsiveBreakpointsModule {
}