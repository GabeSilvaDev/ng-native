import { Component, computed, signal } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';

interface Habit {
  readonly id: string;
  readonly name: string;
  readonly done: boolean;
}

@Component({
  selector: 'app-root',
  imports: [Pressable, ScrollView, Text, View],
  template: `
    <view class="screen">
      <text class="title">Today</text>
      <text class="summary">{{ remaining() }} left to do</text>
      <scroll-view [contentContainerStyle]="{ gap: 8 }">
        @for (habit of habits(); track habit.id) {
          <pressable class="habit" accessibilityRole="button" (press)="toggle(habit.id)">
            <text>{{ habit.name }}</text>
            <text class="status">{{ habit.done ? 'Done' : 'To do' }}</text>
          </pressable>
        } @empty {
          <text class="summary">No habits yet</text>
        }
      </scroll-view>
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

  protected readonly remaining = computed(
    () => this.habits().filter((habit) => !habit.done).length,
  );

  protected toggle(id: string): void {
    this.habits.update((habits) =>
      habits.map((habit) => (habit.id === id ? { ...habit, done: !habit.done } : habit)),
    );
  }
}
