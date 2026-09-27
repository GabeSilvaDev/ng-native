import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import {
  Pressable,
  ScrollView,
  SafeAreaView,
  Switch,
  Text,
  TextInput,
  View,
} from '@ng-native/components';
import { Haptics } from '@ng-native/expo/haptics';
import { NativeNavigation } from '@ng-native/router';
import { Habits } from '../data/habits.ts';

const REMINDER_TIMES = ['07:00', '08:00', '09:00', '12:00', '18:00', '21:00'];

/**
 * Adding or editing a habit: a Signal Form over native fields, presented as a modal. The same
 * component does both - `id()` is set when editing, and its absence is what "new" means.
 */
@Component({
  selector: 'app-habit-form',
  imports: [FormField, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View],
  template: `
    <safe-area-view class="flex-1 bg-zinc-100 dark:bg-black" [edges]="['top', 'bottom']">
      <view class="flex-row items-center justify-between px-5 py-3">
        <pressable accessibilityRole="button" (press)="close()">
          <text class="text-base text-rose-600">Cancel</text>
        </pressable>
        <text class="text-base font-semibold text-zinc-900 dark:text-white">{{ title() }}</text>
        <pressable
          accessibilityRole="button"
          [accessibilityState]="{ disabled: f().invalid() }"
          (press)="submit()"
        >
          <text
            class="text-base font-semibold"
            [class]="f().invalid() ? 'text-zinc-400 dark:text-zinc-600' : 'text-rose-600'"
            >Save</text
          >
        </pressable>
      </view>

      <scroll-view class="flex-1" keyboardShouldPersistTaps="handled">
        <view class="gap-2 px-5 pb-8">
          <text class="mt-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Name</text>
          <text-input
            class="rounded-2xl border border-zinc-200 bg-white p-4 text-[16px] text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            placeholder="Drink water"
            accessibilityLabel="Habit name"
            autoCapitalize="sentences"
            [formField]="f.name"
          />
          @if (f.name().touched() && f.name().errors()[0]; as error) {
            <text class="text-sm text-rose-600">{{ error.message }}</text>
          }

          <text class="mt-5 text-xs font-semibold tracking-wide text-zinc-500 uppercase"
            >Colour</text
          >
          <view class="flex-row flex-wrap gap-3">
            @for (colour of palette; track colour) {
              <pressable
                class="size-10 items-center justify-center rounded-full"
                [style.background-color]="colour"
                accessibilityRole="button"
                [accessibilityLabel]="'Colour ' + colour"
                [accessibilityState]="{ selected: data().colour === colour }"
                (press)="choose('colour', colour)"
              >
                @if (data().colour === colour) {
                  <view class="size-3 rounded-full bg-white"></view>
                }
              </pressable>
            }
          </view>

          <view class="mt-5 flex-row items-center justify-between">
            <text class="text-base text-zinc-900 dark:text-white">Daily reminder</text>
            <switch accessibilityLabel="Daily reminder" [(checked)]="reminderOn" />
          </view>

          @if (reminderOn()) {
            <view class="mt-1 flex-row flex-wrap gap-2">
              @for (time of reminderTimes; track time) {
                <pressable
                  class="rounded-full border px-4 py-2"
                  [class]="
                    data().reminderTime === time
                      ? 'border-rose-600 bg-rose-600'
                      : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                  "
                  accessibilityRole="button"
                  [accessibilityState]="{ selected: data().reminderTime === time }"
                  (press)="choose('reminderTime', time)"
                >
                  <text
                    class="text-sm font-semibold"
                    [class]="
                      data().reminderTime === time ? 'text-white' : 'text-zinc-900 dark:text-white'
                    "
                    >{{ time }}</text
                  >
                </pressable>
              }
            </view>
          }
        </view>
      </scroll-view>
    </safe-area-view>
  `,
})
export class HabitForm {
  private readonly habitsService = inject(Habits);
  private readonly haptics = inject(Haptics);
  private readonly navigation = inject(NativeNavigation);

  /** Set only when editing; its absence is what makes this the "new habit" form. */
  readonly id = input<string>();

  protected readonly palette = this.habitsService.palette;
  protected readonly reminderTimes = REMINDER_TIMES;

  private readonly editing = computed(() => this.habitsService.find(this.id() ?? ''));
  protected readonly title = computed(() => (this.editing() ? 'Edit habit' : 'New habit'));

  // `linkedSignal` rather than a plain `signal`: it reads `id()` through `editing()` for its
  // starting value, and `id()` - a route param bound as an input - is not set yet when a field
  // initializer runs, only once Angular has finished constructing the component.
  protected readonly data = linkedSignal(() => {
    const habit = this.editing();
    return {
      name: habit?.name ?? '',
      colour: habit?.colour ?? this.habitsService.palette[0]!,
      reminderTime: habit?.reminderTime ?? REMINDER_TIMES[1]!,
    };
  });
  protected readonly reminderOn = linkedSignal(() => this.editing()?.reminderTime != null);

  protected readonly f = form(this.data, (path) => {
    required(path.name, { message: 'Give it a name' });
    validate(path.name, ({ value }) => {
      const name = value().trim();
      if (name && this.habitsService.nameTaken(name, this.id())) {
        return { kind: 'unique', message: 'Already tracking a habit with this name' };
      }
      return undefined;
    });
  });

  protected choose(field: 'colour' | 'reminderTime', value: string): void {
    this.data.update((d) => ({ ...d, [field]: value }));
    this.haptics.select();
  }

  protected submit(): void {
    if (this.f().invalid()) {
      this.haptics.notify('error');
      return;
    }
    const { name, colour, reminderTime } = this.data();
    const reminder = this.reminderOn() ? reminderTime : null;
    const existing = this.editing();
    if (existing) this.habitsService.update(existing.id, { name, colour, reminderTime: reminder });
    else this.habitsService.create({ name, colour, reminderTime: reminder });
    this.haptics.notify('success');
    this.navigation.back();
  }

  protected close(): void {
    this.navigation.back();
  }
}
