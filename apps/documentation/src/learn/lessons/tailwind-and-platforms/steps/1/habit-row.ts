import { Component, input, output } from '@angular/core';
import { Pressable, Text } from '@ng-native/components';

@Component({
  selector: 'habit-row',
  imports: [Pressable, Text],
  template: `
    <pressable class="habit" accessibilityRole="button" (press)="toggle.emit()">
      <text>{{ name() }}</text>
      <text class="status">{{ done() ? 'Done' : 'To do' }}</text>
    </pressable>
  `,
  styles: `
    .habit {
      flex-direction: row;
      justify-content: space-between;
      margin-top: 8px;
      padding: 16px;
      border-radius: 12px;
      background-color: #ffffff;
    }

    .habit:active {
      background-color: #e4e4e7;
    }

    .status {
      color: #71717a;
    }
  `,
})
export class HabitRow {
  readonly name = input.required<string>();
  readonly done = input(false);
  readonly toggle = output<void>();
}
