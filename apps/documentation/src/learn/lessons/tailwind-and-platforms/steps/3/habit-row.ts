import { Component, input, output } from '@angular/core';
import { Pressable, Text } from '@ng-native/components';

@Component({
  selector: 'habit-row',
  imports: [Pressable, Text],
  template: `
    <pressable
      class="mt-2 flex-row items-center justify-between rounded-xl bg-white p-4 active:bg-zinc-200 android:rounded-md"
      accessibilityRole="button"
      (press)="toggle.emit()"
    >
      <text class="text-base text-zinc-900">{{ name() }}</text>
      <text [class]="done() ? 'text-emerald-600' : 'text-zinc-500'">
        {{ done() ? 'Done' : 'To do' }}
      </text>
    </pressable>
  `,
})
export class HabitRow {
  readonly name = input.required<string>();
  readonly done = input(false);
  readonly toggle = output<void>();
}
