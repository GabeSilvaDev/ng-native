import { Component, signal } from '@angular/core';
import { FormField, form, minLength, required } from '@angular/forms/signals';
import { ScrollView, Switch, Text, TextInput, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { page } from '../screen-styles.ts';

/**
 * Signal forms over native controls. `text-input` and `switch` are form-aware because they
 * expose `value` and `checked` model signals, which is the whole contract: no adapter class.
 */
@Component({
  selector: 'x-forms',
  imports: [NativeHeader, ScrollView, TextInput, Switch, FormField, Text, View],
  template: `
    <native-header title="Signal forms" />
    <scroll-view
      class="screen"
      [contentContainerStyle]="page.content"
      [automaticallyAdjustKeyboardInsets]="true"
    >
      <text class="hint">required + minLength(3). Type fast: characters must not drop.</text>

      <text-input
        class="field"
        [formField]="f.name"
        placeholder="name"
        placeholderTextColor="#6c6c78"
      />
      @if (f.name().errors().length) {
        <text class="hint danger">{{ f.name().errors().length }} validation error(s)</text>
      } @else {
        <text class="hint success">valid</text>
      }

      <view [style]="page.row">
        <switch [formField]="f.subscribed" />
        <text class="body">subscribed</text>
      </view>

      <text class="body"
        >model: <text class="strong">{{ json() }}</text></text
      >
    </scroll-view>
  `,
})
export class FormsPage {
  protected readonly page = page;
  protected readonly data = signal({ name: '', subscribed: false });
  protected readonly f = form(this.data, (path) => {
    required(path.name);
    minLength(path.name, 3);
  });

  protected json = () => JSON.stringify(this.data());
}
