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
    MdSnackBarModule
  ],
  providers: [MdSnackBarModule]
})
export class VogonMaterialModule { }