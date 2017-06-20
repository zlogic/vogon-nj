import { NgModule } from '@angular/core';

import {
  MdButtonModule,
  MdIconModule,
  MdListModule,
  MdCardModule,
  MdInputModule,
  MdCheckboxModule,
  MdSlideToggleModule,
  MdButtonToggleModule,
  MdDatepickerModule,
  MdMenuModule,
  MdSelectModule,
  MdSidenavModule,
  MdToolbarModule,
  MdSnackBarModule,
  MdChipsModule,
  MdNativeDateModule,
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
    MdSlideToggleModule,
    MdButtonToggleModule,
    MdDatepickerModule,
    MdMenuModule,
    MdSelectModule,
    MdSidenavModule,
    MdToolbarModule,
    MdChipsModule,
    MdSnackBarModule,
    MdNativeDateModule
  ],
  exports: [
    MdButtonModule,
    MdIconModule,
    MdListModule,
    MdCardModule,
    MdInputModule,
    MdCheckboxModule,
    MdSlideToggleModule,
    MdButtonToggleModule,
    MdDatepickerModule,
    MdMenuModule,
    MdSelectModule,
    MdSidenavModule,
    MdToolbarModule,
    MdChipsModule,
    MdSnackBarModule,
    MdNativeDateModule
  ]
})
export class VogonMaterialModule { }