import { Component, signal } from '@angular/core';
import { Text, View } from '@ng-native/components';

interface Habit {
  readonly id: string;
  readonly name: string;
  readonly done: boolean;
}

@Component({
  selector: 'app-root',
  imports: [Text, View],
  template: `
    <view class="screen">
      <text class="title">Today</text>
      <text class="summary">3 left to do</text>
      @for (habit of habits(); track habit.id) {
        <view class="habit">
          <text>{{ habit.name }}</text>
          <text class="status">To do</text>
        </view>
      }
    </view>
  `,
  styles: `
    .screen {
      flex: 1;
      gap: 8px;
      padding: 16px 20px;
      padding-top: calc(var(--safe-area-inset-top, 0px) + 16px);
      background-color: #f4f4f5;
    }

    .title {
      font-size: 30px;
      font-weight: 700;
    }

    .summary {
      color: #71717a;
    }

    .habit {
      flex-direction: row;
      justify-content: space-between;
      margin-top: 8px;
      padding: 16px;
      border-radius: 12px;
      background-color: #ffffff;
    }

    .status {
      color: #71717a;
    }
  `,
})
export class App {
  protected readonly habits = signal<readonly Habit[]>([
    { id: 'water', name: 'Drink water', done: false },
    { id: 'read', name: 'Read ten pages', done: false },
    { id: 'walk', name: 'Walk', done: true },
  ]);
}
