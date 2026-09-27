import { Component, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { ScrollView } from '../../components/src/scroll-view.ts';
import { Switch } from '../../components/src/switch.ts';
import { TextInput } from '../../components/src/text-input.ts';
import { View } from '../../components/src/view.ts';

/** Three fields, the first invalid one being the one a submit should take the user to. */
@Component({
  selector: 'x-form-focus',
  imports: [FormField, TextInput, View],
  template: `
    <view>
      <text-input nativeID="name" [formField]="f.name" />
      <view>
        <text-input nativeID="email" [formField]="f.email" />
      </view>
      <text-input nativeID="city" [formField]="f.city" />
    </view>
  `,
})
export class FormFocus {
  readonly data = signal({ name: 'Ada', email: 'not an address', city: '' });
  readonly f = form(this.data, (path) => {
    required(path.name);
    email(path.email);
    required(path.city);
  });
}

/** A form in a scroll view whose first invalid field is a toggle, far down the page. */
@Component({
  selector: 'x-form-focus-toggle',
  imports: [FormField, ScrollView, Switch, TextInput, View],
  template: `
    <scroll-view nativeID="page">
      <text-input nativeID="name" [formField]="f.name" />
      <view nativeID="spacer" [style]="{ height: 2000 }"></view>
      <switch nativeID="terms" [formField]="f.terms" />
    </scroll-view>
  `,
})
export class FormFocusToggle {
  readonly data = signal({ name: 'Ada', terms: false });
  readonly f = form(this.data);
}

/** Fields down a scrolling page, as a form's are, for moving between with the keyboard up. */
@Component({
  selector: 'x-fields-on-page',
  imports: [ScrollView, TextInput],
  template: `
    <scroll-view nativeID="page">
      <text-input nativeID="city" />
      <text-input nativeID="postcode" />
    </scroll-view>
  `,
})
export class FieldsOnPage {}

/** A field inside a sideways carousel inside a page: the page is what has to move. */
@Component({
  selector: 'x-field-in-carousel',
  imports: [ScrollView, TextInput],
  template: `
    <scroll-view nativeID="page">
      <scroll-view nativeID="carousel" [horizontal]="true">
        <text-input nativeID="note" />
      </scroll-view>
    </scroll-view>
  `,
})
export class FieldInCarousel {}
