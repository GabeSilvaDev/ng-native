import { Component, signal } from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { Text, TextInput, View } from '@ng-native/components';

@Component({
  selector: 'new-habit',
  imports: [FormField, Text, TextInput, View],
  template: `
    <view class="mt-2 flex-row gap-2">
      <text-input
        class="flex-1 rounded-xl bg-white px-4 py-3 text-base text-zinc-900"
        placeholder="New habit"
        [formField]="habit.name"
      />
    </view>
    @if (habit.name().touched() && habit.name().invalid()) {
      <text class="text-sm text-red-600" accessibilityRole="alert">
        {{ habit.name().errors()[0]?.message }}
      </text>
    }
  `,
})
export class NewHabit {
  protected readonly model = signal({ name: '' });
  protected readonly habit = form(this.model, (path) => {
    required(path.name, { message: 'Give the habit a name' });
    maxLength(path.name, 30);
  });
}
