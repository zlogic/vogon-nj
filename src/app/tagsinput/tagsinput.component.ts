import { Component, Input, ElementRef, ViewChild, forwardRef } from '@angular/core';
import { MatChipInputEvent, MatAutocompleteSelectedEvent } from '@angular/material';
import { FormControl, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ENTER } from '@angular/cdk/keycodes';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';


import { TagsService } from '../service/tags.service';

@Component({
  selector: 'tags-input',
  templateUrl: './tagsinput.component.html',
  providers: [{ 
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TagsInputComponent),
    multi: true
  }]
})

export class TagsInputComponent implements ControlValueAccessor {
  tags: string[];
  @Input('placeholder') placeholder: string;
  @Input('class') styleClass: string;
  @Input('allowCreate') allowCreate: boolean = true;

  @ViewChild('tagsInput') tagsInput: ElementRef;
  filteredTags: Observable<string[]>;
  tagsControl = new FormControl();
  separatorKeysCodes: number[] = [ENTER];

  private propagateChange = (_: any) => {};

  addTag(event: MatChipInputEvent) {
    const input = event.input;
    const value = this.allowCreate ? event.value : '';
    
    if ((value || '').trim())
      this.tags.push(value.trim());
    if (input)
      input.value = '';
    this.tagsControl.setValue(null);
    
    this.propagateChange(this.tags);
  }
  removeTag(i: number) {
    this.tags.splice(i, 1);

    this.propagateChange(this.tags);
  }

  private _filter(value: string): string[] {
    const filterValue = value ? value.toLowerCase() : '';
    return this.tagsService.tags.filter((tag: string) => tag != '' && tag.toLowerCase().includes(filterValue));
  }

  selectedTag(event: MatAutocompleteSelectedEvent): void {
    this.tags.push(event.option.viewValue);
    this.tagsInput.nativeElement.value = '';
    this.tagsControl.setValue(null);

    this.propagateChange(this.tags);
  }

  writeValue(value: string[]) {
    this.tags = value;
  }

  registerOnChange(fn: (_: any) => void) {
    this.propagateChange = fn;
  }

  registerOnTouched() {}

  constructor(
    public tagsService: TagsService
  ) {
    this.filteredTags = this.tagsControl.valueChanges
      .pipe(startWith(''), map(value => this._filter(value)));
  }
  
}