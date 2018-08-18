import { Component, ViewChild, ElementRef } from '@angular/core';
import { mergeMap } from 'rxjs/operators';

import { AuthorizationService } from '../service/auth.service';
import { UserService } from '../service/user.service';

@Component({
  templateUrl: '../templates/components/usersettings.html'
})

export class UsersettingsComponent {
  @ViewChild('fileInput') fileInput: ElementRef;
  @ViewChild('exportForm') exportForm: ElementRef;
  username: string;
  password: string;

  submitEditing() {
    var userdata: any = {username: this.username};
    if (this.password !== undefined && this.password !== null) {
      userdata['password'] = this.password;
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

  constructor(
    public authorizationService: AuthorizationService,
    public userService: UserService
  ) {
    this.username = this.userService.username;
    this.userService.userObservable.subscribe(() => {
      this.username = this.userService.username;
    });
  }
}
