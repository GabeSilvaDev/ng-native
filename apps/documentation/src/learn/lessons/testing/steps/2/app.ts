import { Component, computed, inject, signal } from '@angular/core';
import { ScrollView, Text, View } from '@ng-native/components';
import { ColorScheme } from '@ng-native/device';
import { HabitRow } from './habit-row';
import { NewHabit } from './new-habit';

interface Habit {
  readonly id: string;
  readonly name: string;
  readonly done: boolean;
}

@Component({
  selector: 'app-root',
  imports: [HabitRow, NewHabit, ScrollView, Text, View],
  host: { '[class.dark]': 'dark()' },
  template: `
    <view class="flex-1 gap-2 bg-zinc-100 px-5 pt-safe dark:bg-black">
      <text
        class="pt-4 text-3xl font-bold text-zinc-900 android:text-2xl android:font-medium dark:text-white"
      >
        Today
      </text>
      <text class="text-zinc-500 ios:text-xs ios:font-semibold ios:uppercase dark:text-zinc-400">
        {{ remaining() }} left to do
      </text>
      <new-habit (add)="add($event)" />
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
  private readonly scheme = inject(ColorScheme);

  protected readonly dark = computed(() => this.scheme.current() === 'dark');

  protected readonly habits = signal<readonly Habit[]>([
    { id: 'water', name: 'Drink water', done: false },
    { id: 'read', name: 'Read ten pages', done: false },
    { id: 'walk', name: 'Walk', done: true },
  ]);

  protected readonly remaining = computed(
    () => this.habits().filter((habit) => !habit.done).length,
  );

  private nextHabitId = 0;

  protected add(name: string): void {
    const id = `habit-${++this.nextHabitId}`;
    this.habits.update((habits) => [...habits, { id, name, done: false }]);
  }

  protected toggle(id: string): void {
    this.habits.update((habits) =>
      habits.map((habit) => (habit.id === id ? { ...habit, done: !habit.done } : habit)),
    );
  }
}
