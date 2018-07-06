import { Component, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { mergeMap } from 'rxjs/operators';

import { AuthorizationService } from '../service/auth.service';
import { UserService } from '../service/user.service';

@Component({
  templateUrl: '../templates/components/usersettings.pug'
})

export class UsersettingsComponent {
  usersettingsForm: FormGroup;
  @ViewChild('fileInput') fileInput: ElementRef;
  @ViewChild('exportForm') exportForm: ElementRef;

  submitEditing() {
    var username = this.usersettingsForm.controls['username'].value;
    var password = this.usersettingsForm.controls['password'].value;
    var userdata: any = {username: username};
    if (password !== undefined && password !== null) {
      userdata['password'] = password;
    }
    return this.userService.submit(userdata)
      .pipe(mergeMap(() => this.userService.importData(this.getFile())))
      .subscribe();
  }
  cancelEditing() {
    this.userService.update().subscribe();
  }
  private getFile() {
    return this.fileInput.nativeElement.files[0];
  }
  importData() {
    this.userService.importData(this.getFile()).subscribe();
  };
  exportData() {
    this.exportForm.nativeElement.submit();
  }
  ngOnInit() {
    this.usersettingsForm = this.formBuilder.group({
      'username': [this.userService.username, Validators.required],
      'password': undefined
    });
    this.userService.userObservable.subscribe(() => {
      this.usersettingsForm.controls['username'].setValue(this.userService.username);
    });
  }

  constructor(
    private formBuilder: FormBuilder,
    public authorizationService: AuthorizationService,
    public userService: UserService
  ) { }
}
