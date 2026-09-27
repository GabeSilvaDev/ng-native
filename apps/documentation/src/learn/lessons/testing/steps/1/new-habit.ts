import { Component, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { Pressable, Text, TextInput, View } from '@ng-native/components';

@Component({
  selector: 'new-habit',
  imports: [FormField, Pressable, Text, TextInput, View],
  template: `
    <view class="mt-2 flex-row gap-2">
      <text-input
        class="flex-1 rounded-xl bg-white px-4 py-3 text-base text-zinc-900 dark:bg-zinc-900 dark:text-white"
        placeholder="New habit"
        returnKeyType="done"
        submitBehavior="submit"
        [formField]="habit.name"
        (submitEditing)="save()"
      />
      <pressable
        class="justify-center rounded-xl bg-emerald-600 px-4 active:bg-emerald-700"
        accessibilityRole="button"
        (press)="save()"
      >
        <text class="font-semibold text-white">Add</text>
      </pressable>
    </view>
    @if (habit.name().touched() && habit.name().invalid()) {
      <text class="text-sm text-red-600" accessibilityRole="alert">
        {{ habit.name().errors()[0]?.message }}
      </text>
    }
  `,
})
export class NewHabit {
  readonly add = output<string>();

  protected readonly model = signal({ name: '' });
  protected readonly habit = form(this.model, (path) => {
    required(path.name, { message: 'Give the habit a name' });
    maxLength(path.name, 30);
  });

  protected save(): void {
    void submit(this.habit, async () => {
      this.add.emit(this.model().name);
      this.habit().reset({ name: '' });
      return undefined;
    });
  }
}
