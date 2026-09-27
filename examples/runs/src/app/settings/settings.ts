import { Component, inject } from '@angular/core';
import { Pressable, SafeAreaView, ScrollView, Switch, Text, View } from '@ng-native/components';
import { LocationSourceSetting } from './location-source-setting.ts';
import { Units } from './units.ts';

declare const __DEV__: boolean | undefined;

/** Units, and - in development - which location source a run records from. */
@Component({
  selector: 'app-settings',
  imports: [Pressable, SafeAreaView, ScrollView, Switch, Text, View],
  template: `
    <safe-area-view class="flex-1 bg-zinc-100 dark:bg-black" [edges]="['top']">
      <scroll-view class="flex-1">
        <text class="px-5 pt-4 pb-3 text-3xl font-bold text-zinc-900 dark:text-white"
          >Settings</text
        >

        <text class="px-5 pt-4 pb-2 text-xs text-zinc-500 uppercase">Units</text>
        <view class="bg-white dark:bg-zinc-900 ios:mx-4 ios:rounded-xl">
          <view class="flex-row items-center justify-between px-4 py-3">
            <text class="text-zinc-900 dark:text-white">Distance and pace</text>
            <view
              class="flex-row overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700"
            >
              <pressable
                class="px-4 py-2"
                [class]="unit() === 'km' ? 'bg-orange-500' : ''"
                accessibilityRole="button"
                [accessibilityState]="{ selected: unit() === 'km' }"
                (press)="chooseUnit('km')"
              >
                <text
                  class="text-sm font-semibold"
                  [class]="unit() === 'km' ? 'text-white' : 'text-zinc-900 dark:text-white'"
                  >km</text
                >
              </pressable>
              <pressable
                class="px-4 py-2"
                [class]="unit() === 'mi' ? 'bg-orange-500' : ''"
                accessibilityRole="button"
                [accessibilityState]="{ selected: unit() === 'mi' }"
                (press)="chooseUnit('mi')"
              >
                <text
                  class="text-sm font-semibold"
                  [class]="unit() === 'mi' ? 'text-white' : 'text-zinc-900 dark:text-white'"
                  >mi</text
                >
              </pressable>
            </view>
          </view>
        </view>

        @if (showDeveloperSection) {
          <text class="px-5 pt-6 pb-2 text-xs text-zinc-500 uppercase">Developer</text>
          <view class="bg-white dark:bg-zinc-900 ios:mx-4 ios:rounded-xl">
            <view class="flex-row items-center justify-between px-4 py-3">
              <view class="flex-1 pr-3">
                <text class="text-zinc-900 dark:text-white">Simulate location</text>
                <text class="text-xs text-zinc-500"
                  >Replays a recorded route instead of the GPS.</text
                >
              </view>
              <switch
                accessibilityLabel="Simulate location"
                [checked]="simulateLocation()"
                (checkedChange)="toggleSimulatedLocation($event)"
              />
            </view>
          </view>
        }
      </scroll-view>
    </safe-area-view>
  `,
})
export class Settings {
  private readonly units = inject(Units);
  private readonly locationSetting = inject(LocationSourceSetting);

  protected readonly unit = this.units.unit;
  protected readonly simulateLocation = this.locationSetting.simulate;
  protected readonly showDeveloperSection = typeof __DEV__ === 'undefined' || __DEV__;

  protected chooseUnit(unit: 'km' | 'mi'): void {
    this.units.unit.set(unit);
  }

  protected toggleSimulatedLocation(wants: boolean): void {
    this.locationSetting.simulate.set(wants);
  }
}
