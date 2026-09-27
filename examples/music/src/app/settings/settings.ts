import { Component, signal } from '@angular/core';
import { SafeAreaView, ScrollView, Switch, Text, View } from '@ng-native/components';
import { MiniPlayerBar } from '../now-playing/mini-player-bar.ts';

/**
 * One template that follows each platform's conventions: an inset grouped list with a large
 * title on iOS, a flat list under a tinted section header on Android - the `ios:` and `android:`
 * variants do it, the same pattern the wallet example's settings screen uses.
 */
@Component({
  selector: 'app-settings',
  imports: [MiniPlayerBar, SafeAreaView, ScrollView, Switch, Text, View],
  template: `
    <safe-area-view
      class="flex-1 bg-zinc-100 dark:bg-black android:bg-white android:dark:bg-zinc-950"
      [edges]="['top']"
    >
      <scroll-view class="flex-1">
        <text
          class="px-5 pt-4 pb-3 text-zinc-900 dark:text-white ios:text-3xl ios:font-bold android:text-2xl"
        >
          Settings
        </text>
        @for (section of sections; track section.title) {
          <text
            class="px-5 pt-4 pb-2 text-xs text-zinc-500 ios:uppercase android:font-semibold android:text-rose-600"
          >
            {{ section.title }}
          </text>
          <view class="bg-white dark:bg-zinc-900 ios:mx-4 ios:rounded-xl android:bg-transparent">
            @for (row of section.rows; track row.label; let last = $last) {
              <view
                class="flex-row items-center justify-between px-4 ios:py-3 android:py-4"
                [class]="last ? '' : 'border-b-hairline border-zinc-200 dark:border-zinc-800'"
              >
                <text class="text-zinc-900 dark:text-white">{{ row.label }}</text>
                <switch [accessibilityLabel]="row.label" [(checked)]="row.on" />
              </view>
            }
          </view>
        }
      </scroll-view>
    </safe-area-view>
    <app-mini-player-bar class="absolute bottom-0 left-0 right-0" />
  `,
})
export class Settings {
  protected readonly sections = [
    {
      title: 'Playback',
      rows: [
        { label: 'High quality audio', on: signal(true) },
        { label: 'Autoplay related songs', on: signal(false) },
      ],
    },
    {
      title: 'Notifications',
      rows: [{ label: 'New releases', on: signal(true) }],
    },
  ];
}
