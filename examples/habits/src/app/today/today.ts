import { Component, computed, inject } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideFlame, lucidePlus } from '@ng-icons/lucide';
import { NgIcon } from '@ng-native/icons';
import { Haptics } from '@ng-native/expo/haptics';
import { ColorScheme } from '@ng-native/device';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import {
  NativeHeader,
  NativeHeaderItem,
  NativeNavigation,
  NativeStackOutlet,
} from '@ng-native/router';
import { Habits } from '../data/habits.ts';
import { HabitRow } from './habit-row.ts';
import { ProgressBar } from './progress-bar.ts';

/** The Today tab is a stack of its own, for the native header its large title and "+" need. */
@Component({
  selector: 'app-today-stack',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class TodayStack {}

/**
 * The habits due today: a progress bar for the day, and a checklist. Checking one off animates,
 * fires a haptic, and updates every streak on screen.
 */
@Component({
  selector: 'app-today',
  imports: [
    HabitRow,
    NativeHeader,
    NativeHeaderItem,
    NgIcon,
    Pressable,
    ProgressBar,
    ScrollView,
    Text,
    View,
  ],
  providers: [provideIcons({ lucideCheck, lucideFlame, lucidePlus })],
  template: `
    <native-header title="Today" [largeTitle]="true">
      <native-header-item type="right">
        <pressable
          class="add"
          accessibilityRole="button"
          accessibilityLabel="New habit"
          (press)="addHabit()"
        >
          <ng-icon name="lucidePlus" size="22" [color]="headerIcon()" />
        </pressable>
      </native-header-item>
    </native-header>

    <scroll-view class="screen" contentInsetAdjustmentBehavior="automatic">
      <view class="content">
        <app-progress-bar [done]="doneCount()" [total]="habits().length" />

        @if (habits().length === 0) {
          <view class="empty">
            <text class="empty-title">No habits yet</text>
            <text class="empty-body">Tap + to add the first one.</text>
          </view>
        } @else {
          <view class="list">
            @for (habit of habits(); track habit.id) {
              <app-habit-row
                [habit]="habit"
                [done]="isDone(habit.id)"
                [streak]="streak(habit.id)"
                (toggle)="toggleHabit(habit.id)"
                (open)="openHabit(habit.id)"
              />
            }
          </view>
        }
      </view>
    </scroll-view>
  `,
  styleUrl: './today.css',
})
export class Today {
  private readonly colorScheme = inject(ColorScheme);
  /** The header button's icon, dark on a light bar and light on a dark one. */
  protected readonly headerIcon = computed(() =>
    this.colorScheme.current() === 'dark' ? '#fafafa' : '#18181b',
  );

  private readonly habitsService = inject(Habits);
  private readonly haptics = inject(Haptics);
  private readonly navigation = inject(NativeNavigation);

  protected readonly habits = this.habitsService.habits;
  protected readonly doneCount = computed(
    () => this.habits().filter((habit) => this.isDone(habit.id)).length,
  );

  protected isDone(id: string): boolean {
    return this.habitsService.isDone(id);
  }

  protected streak(id: string): number {
    return this.habitsService.streak(id);
  }

  protected toggleHabit(id: string): void {
    const wasDone = this.isDone(id);
    this.habitsService.toggleToday(id);
    this.haptics.notify(wasDone ? 'warning' : 'success');
  }

  protected openHabit(id: string): void {
    void this.navigation.push(['/habit', id]);
  }

  protected addHabit(): void {
    void this.navigation.present(['/habit/new']);
  }
}
