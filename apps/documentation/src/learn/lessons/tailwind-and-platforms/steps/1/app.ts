import { Component, computed, signal } from '@angular/core';
import { ScrollView, Text, View } from '@ng-native/components';
import { HabitRow } from './habit-row';

interface Habit {
  readonly id: string;
  readonly name: string;
  readonly done: boolean;
}

@Component({
  selector: 'app-root',
  imports: [HabitRow, ScrollView, Text, View],
  template: `
    <view class="flex-1 gap-2 bg-zinc-100 px-5 pt-safe">
      <text class="pt-4 text-3xl font-bold text-zinc-900">Today</text>
      <text class="text-zinc-500">{{ remaining() }} left to do</text>
      <scroll-view [contentContainerStyle]="{ gap: 8 }">
        @for (habit of habits(); track habit.id) {
          <habit-row [name]="habit.name" [done]="habit.done" (toggle)="toggle(habit.id)" />
        } @empty {
          <text class="text-zinc-500">No habits yet</text>
        }
      </scroll-view>
    </view>
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
