import { Component, signal, viewChild } from '@angular/core';
import { View } from '../../components/src/view.ts';
import { FormField, form, minLength, required } from '@angular/forms/signals';
import { Switch } from '../../components/src/switch.ts';
import { TextInput } from '../../components/src/text-input.ts';

@Component({
  selector: 'x-signal-form',
  imports: [FormField, TextInput, Switch, View],
  template: `
    <view>
      <text-input [formField]="f.name" />
      <switch [formField]="f.subscribed" />
    </view>
  `,
})
export class SignalForm {
  data = signal({ name: '', subscribed: false });
  readonly input = viewChild.required(TextInput);

  f = form(this.data, (path) => {
    required(path.name);
    minLength(path.name, 3);
  });
}

/** The same form with `FormField` left out of `imports`, which Angular does not notice here. */
@Component({
  selector: 'x-forgotten-form-field',
  imports: [TextInput, Switch, View],
  template: `
    <view>
      <text-input [formField]="f.name" />
      <text-input [formField]="f.name" />
      <switch [formField]="f.subscribed" />
    </view>
  `,
})
export class ForgottenFormField {
  data = signal({ name: '', subscribed: false });
  f = form(this.data);
}
