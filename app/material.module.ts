import { NgModule } from '@angular/core';

import {
  MdButtonModule,
  MdIconModule,
  MdListModule,
  MdCardModule,
  MdInputModule,
  MdCheckboxModule,
  MdButtonToggleModule,
  MdSidenavModule,
  MdToolbarModule,
  MdSnackBarModule,
  MdChipsModule,
  MaterialModule
} from '@angular/material';

@NgModule({
  imports: [
    MdButtonModule,
    MdIconModule,
    MdListModule,
    MdCardModule,
    MdInputModule,
    MdCheckboxModule,
    MdButtonToggleModule,
    MdSidenavModule,
    MdToolbarModule,
    MdChipsModule,
    MdSnackBarModule,
  ],
  exports: [
    MdButtonModule,
    MdIconModule,
    MdListModule,
    MdCardModule,
    MdInputModule,
    MdCheckboxModule,
    MdButtonToggleModule,
    MdSidenavModule,
    MdToolbarModule,
    MdChipsModule,
    MdSnackBarModule
  ],
  providers: [MdSnackBarModule]
})
export class VogonMaterialModule { }