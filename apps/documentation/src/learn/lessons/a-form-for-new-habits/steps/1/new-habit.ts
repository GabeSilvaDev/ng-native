import { Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { TextInput, View } from '@ng-native/components';

@Component({
  selector: 'new-habit',
  imports: [FormField, TextInput, View],
  template: `
    <view class="mt-2 flex-row gap-2">
      <text-input
        class="flex-1 rounded-xl bg-white px-4 py-3 text-base text-zinc-900"
        placeholder="New habit"
        [formField]="habit.name"
      />
    </view>
  `,
})
export class NewHabit {
  protected readonly model = signal({ name: '' });
  protected readonly habit = form(this.model);
}
