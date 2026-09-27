import { Component, computed, inject, signal } from '@angular/core';
import * as Notifications from 'expo-notifications';
import { provideIcons } from '@ng-icons/core';
import { lucideFlame } from '@ng-icons/lucide';
import { NgIcon } from '@ng-native/icons';
import { Permission } from '@ng-native/expo';
import { SafeAreaView, ScrollView, Switch, Text, View } from '@ng-native/components';
import { Habits } from '../data/habits.ts';

/** One daily local notification per habit that has a reminder time set. */
async function scheduleReminders(
  habits: readonly {
    readonly id: string;
    readonly name: string;
    readonly reminderTime: string | null;
  }[],
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const habit of habits) {
    if (!habit.reminderTime) continue;
    const [hour, minute] = habit.reminderTime.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: habit.id,
      content: { title: habit.name, body: "Don't forget today." },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hour ?? 9,
        minute: minute ?? 0,
      },
    });
  }
}

/**
 * Reminders and a quick look at every streak. `Permission` covers the platform dialog and the
 * denied state; scheduling itself is plain `expo-notifications`, called directly as the docs for
 * [Notifications](/packages/expo/notifications) recommend.
 */
@Component({
  selector: 'app-settings',
  imports: [NgIcon, SafeAreaView, ScrollView, Switch, Text, View],
  providers: [provideIcons({ lucideFlame })],
  template: `
    <safe-area-view class="flex-1 bg-zinc-100 dark:bg-black" [edges]="['top']">
      <scroll-view class="flex-1">
        <text class="px-5 pt-4 pb-3 text-3xl font-bold text-zinc-900 dark:text-white"
          >Settings</text
        >

        <text class="px-5 pt-4 pb-2 text-xs text-zinc-500 uppercase">Reminders</text>
        <view class="bg-white dark:bg-zinc-900 ios:mx-4 ios:rounded-xl">
          <view class="flex-row items-center justify-between px-4 py-3">
            <text class="text-zinc-900 dark:text-white">Daily reminders</text>
            <switch
              accessibilityLabel="Daily reminders"
              [checked]="remindersOn()"
              (checkedChange)="toggleReminders($event)"
            />
          </view>
          @if (permission.blocked()) {
            <text class="px-4 pb-3 text-sm text-rose-600">
              Notifications are turned off for Habits. Enable them in the system Settings app to get
              reminders.
            </text>
          }
        </view>

        <text class="px-5 pt-6 pb-2 text-xs text-zinc-500 uppercase">Streaks</text>
        <view class="bg-white dark:bg-zinc-900 ios:mx-4 ios:rounded-xl">
          @for (habit of habits(); track habit.id; let last = $last) {
            <view
              class="flex-row items-center justify-between px-4 py-3"
              [class]="last ? '' : 'border-b-hairline border-zinc-200 dark:border-zinc-800'"
            >
              <view class="flex-row items-center gap-3">
                <view class="size-3 rounded-full" [style.background-color]="habit.colour"></view>
                <text class="text-zinc-900 dark:text-white">{{ habit.name }}</text>
              </view>
              <view class="flex-row items-center gap-1">
                <ng-icon name="lucideFlame" size="14" color="#f97316" />
                <text class="text-sm font-semibold text-zinc-500">{{ streak(habit.id) }}</text>
              </view>
            </view>
          } @empty {
            <text class="px-4 py-3 text-zinc-500">No habits yet.</text>
          }
        </view>
      </scroll-view>
    </safe-area-view>
  `,
})
export class Settings {
  private readonly habitsService = inject(Habits);

  protected readonly habits = this.habitsService.habits;
  protected readonly permission = Permission.of(
    Notifications.getPermissionsAsync,
    Notifications.requestPermissionsAsync,
  );
  protected readonly remindersOn = signal(false);

  protected streak(id: string): number {
    return this.habitsService.streak(id);
  }

  protected async toggleReminders(wants: boolean): Promise<void> {
    if (!wants) {
      this.remindersOn.set(false);
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }
    const granted = await this.permission.ensure();
    this.remindersOn.set(granted);
    if (granted) await scheduleReminders(this.habits());
  }
}
