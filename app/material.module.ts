import { NgModule } from '@angular/core';

import {
  MdButtonModule,
  MdIconModule,
  MdListModule,
  MdSidenavModule,
  MdToolbarModule,
  MdSnackBarModule,
  MaterialModule
} from '@angular/material';

@NgModule({
  imports: [
    MdButtonModule,
    MdIconModule,
    MdListModule,
    MdSidenavModule,
    MdToolbarModule,
    MdSnackBarModule,
  ],
  exports: [
    MdButtonModule,
    MdIconModule,
    MdListModule,
    MdSidenavModule,
    MdToolbarModule,
    MdSnackBarModule
  ],
  providers: [MdSnackBarModule]
})
export class VogonMaterialModule { }