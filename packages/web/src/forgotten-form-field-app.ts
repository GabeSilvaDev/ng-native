/**
 * Fixture for `unbound-directive-input.test.ts`: two components which differ only in whether
 * `FormField` is in `imports`. Mirrors
 * `packages/integration-tests/fixtures/signal-form.ts`, which the native adapter's own version of
 * this check uses.
 */
import { Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { Switch, TextInput, View } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [FormField, TextInput, Switch, View],
  template: `
    <view>
      <text-input [formField]="f.name" />
      <switch [formField]="f.subscribed" />
    </view>
  `,
})
export class SignalFormApp {
  data = signal({ name: '', subscribed: false });
  f = form(this.data);
}

/** The same form with `FormField` left out of `imports`, which Angular does not notice here. */
@Component({
  selector: 'app-root',
  imports: [TextInput, Switch, View],
  template: `
    <view>
      <text-input [formField]="f.name" />
      <text-input [formField]="f.name" />
      <switch [formField]="f.subscribed" />
    </view>
  `,
})
export class ForgottenFormFieldApp {
  data = signal({ name: '', subscribed: false });
  f = form(this.data);
}
