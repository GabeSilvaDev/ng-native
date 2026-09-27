/*
 * Tailwind, with the native preset's variants: one template that follows each platform's
 * conventions (`ios:`, `android:`) and the system appearance (`dark:`). On iOS an inset grouped
 * list with rounded groups; on Android flat, full-width rows under tinted section headers.
 * Nothing branches in TypeScript.
 */
import { Component, effect, inject, signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideChevronRight,
  lucideCrown,
  lucideHardDrive,
  lucideMapPin,
  lucideShield,
} from '@ng-icons/lucide';
import { Switch, Text, View } from '@ng-native/components';
import { ColorScheme, StatusBar } from '@ng-native/device';
import { NgIcon } from '@ng-native/icons';

@Component({
  selector: 'app-settings',
  imports: [NgIcon, Switch, Text, View],
  providers: [
    provideIcons({
      lucideBell,
      lucideChevronRight,
      lucideCrown,
      lucideHardDrive,
      lucideMapPin,
      lucideShield,
    }),
  ],
  template: `
    <view class="flex-1 bg-zinc-100 pt-16 dark:bg-black android:bg-white android:dark:bg-zinc-950">
      <text
        class="px-5 text-zinc-950 dark:text-white ios:text-[34px] ios:font-bold android:text-2xl"
      >
        Settings
      </text>

      <!-- excerpt: html -->
      <view
        class="mt-4 flex-row items-center gap-4 bg-white p-4 dark:bg-zinc-900 ios:mx-4 ios:rounded-2xl android:mx-4 android:rounded-3xl android:bg-rose-50 android:dark:bg-rose-950/40"
      >
        <view
          class="size-14 items-center justify-center rounded-full bg-linear-to-br from-rose-500 to-amber-400"
        >
          <text class="text-lg font-bold text-white">AL</text>
        </view>
        <view class="flex-1">
          <text class="text-lg font-semibold text-zinc-950 dark:text-white">Ada Lovelace</text>
          <text class="text-sm text-zinc-500">Pro member since 2024</text>
        </view>
        <ng-icon name="lucideChevronRight" size="20" color="#a1a1aa" />
      </view>
      <!-- excerpt end -->

      <text
        class="mt-6 px-5 pb-2 text-[13px] text-zinc-500 ios:uppercase android:font-semibold android:text-rose-600"
      >
        Preferences
      </text>
      <view class="bg-white dark:bg-zinc-900 ios:mx-4 ios:rounded-2xl android:bg-transparent">
        @for (row of rows; track row.label; let last = $last) {
          <view
            class="flex-row items-center gap-3 px-4 ios:py-3 android:py-4"
            [class]="last ? '' : 'border-b border-zinc-200 dark:border-zinc-800 android:border-0'"
          >
            <view
              class="size-8 items-center justify-center ios:rounded-lg android:rounded-full"
              [style.backgroundColor]="row.tint"
            >
              <ng-icon [name]="row.icon" size="17" color="#ffffff" />
            </view>
            <text class="flex-1 text-base text-zinc-950 dark:text-white">{{ row.label }}</text>
            <switch [(checked)]="row.on" />
          </view>
        }
      </view>

      <text
        class="mt-6 px-5 pb-2 text-[13px] text-zinc-500 ios:uppercase android:font-semibold android:text-rose-600"
      >
        Account
      </text>
      <view class="bg-white dark:bg-zinc-900 ios:mx-4 ios:rounded-2xl android:bg-transparent">
        @for (row of account; track row.label; let last = $last) {
          <view
            class="flex-row items-center gap-3 px-4 py-3.5 android:py-4"
            [class]="last ? '' : 'border-b border-zinc-200 dark:border-zinc-800 android:border-0'"
          >
            <view
              class="size-8 items-center justify-center ios:rounded-lg android:rounded-full"
              [style.backgroundColor]="row.tint"
            >
              <ng-icon [name]="row.icon" size="17" color="#ffffff" />
            </view>
            <text class="flex-1 text-base text-zinc-950 dark:text-white">{{ row.label }}</text>
            <text class="text-base text-zinc-500">{{ row.value }}</text>
            <ng-icon name="lucideChevronRight" size="18" color="#a1a1aa" />
          </view>
        }
      </view>
    </view>
  `,
})
export default class Settings {
  protected readonly rows = [
    { label: 'Notifications', icon: 'lucideBell', tint: '#ef4444', on: signal(true) },
    { label: 'Location', icon: 'lucideMapPin', tint: '#3b82f6', on: signal(false) },
    { label: 'Face ID unlock', icon: 'lucideShield', tint: '#10b981', on: signal(true) },
  ];
  constructor() {
    // Dark icons over the light screen, light ones over the dark one.
    const scheme = inject(ColorScheme);
    const statusBar = inject(StatusBar);
    effect(() => statusBar.set({ style: scheme.current() === 'dark' ? 'light' : 'dark' }));
  }

  protected readonly account = [
    { label: 'Subscription', icon: 'lucideCrown', tint: '#f59e0b', value: 'Pro' },
    { label: 'Storage', icon: 'lucideHardDrive', tint: '#71717a', value: '12.4 GB' },
  ];
}
