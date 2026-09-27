/*
 * One of the landing page's three hero apps: a fitness summary. The activity rings are bordered
 * circles, each arc three or two of its four sides, turned so the gap sits where a ring ends. The
 * run's map is drawn, not loaded: streets and a park are views, and the route is a line of short
 * rotated views with round joints. Photographed on the iOS simulator and the Android emulator;
 * see the landing README.
 */
import { Component, inject } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideFlame, lucideFootprints, lucideHeartPulse, lucideTimer } from '@ng-icons/lucide';
import { Text, View } from '@ng-native/components';
import { StatusBar } from '@ng-native/device';
import { NgIcon } from '@ng-native/icons';

/** The run, in the map's own coordinates: 362 wide, 300 tall. */
const ROUTE: readonly [number, number][] = [
  [34, 220],
  [70, 200],
  [96, 162],
  [150, 150],
  [178, 116],
  [226, 108],
  [252, 76],
  [306, 82],
  [332, 58],
];
const LINE = 5;

@Component({
  selector: 'app-fitness',
  imports: [NgIcon, Text, View],
  providers: [provideIcons({ lucideFlame, lucideFootprints, lucideHeartPulse, lucideTimer })],
  template: `
    <view class="flex-1 bg-[#f3f3f5] px-5 pt-16">
      <view class="flex-row items-center justify-between">
        <view>
          <text class="text-sm font-medium text-zinc-500">Good evening, Ada</text>
          <text class="text-[34px] font-bold tracking-tight text-zinc-950">Today</text>
        </view>
        <view class="flex-row items-center gap-1.5 rounded-full bg-white px-3 py-2 shadow-sm">
          <ng-icon name="lucideFlame" size="16" color="#f97316" />
          <text class="text-xs font-bold text-zinc-900">12-day streak</text>
        </view>
      </view>

      <view class="mt-5 flex-row items-center gap-6 rounded-[30px] bg-[#0e0e12] p-5">
        <view class="size-[136px]">
          @for (ring of rings; track ring.name) {
            <view
              class="absolute rounded-full"
              [style.inset.px]="ring.inset"
              [style.borderWidth.px]="13"
              [style.borderColor]="ring.track"
            ></view>
            <view
              class="absolute rounded-full"
              [style.inset.px]="ring.inset"
              [style.borderWidth.px]="13"
              [style.borderTopColor]="ring.color"
              [style.borderRightColor]="ring.color"
              [style.borderBottomColor]="ring.full ? ring.color : 'transparent'"
              [style.borderLeftColor]="'transparent'"
              [style.transform]="'rotate(45deg)'"
            ></view>
          }
        </view>
        <view class="flex-1 gap-3.5">
          @for (ring of rings; track ring.name) {
            <view>
              <text class="text-[11px] font-bold tracking-[1.5px]" [style.color]="ring.color">
                {{ ring.name }}
              </text>
              <view class="flex-row items-baseline">
                <text class="text-xl font-bold text-white">{{ ring.value }}</text>
                <text class="ml-1 text-sm font-medium text-white/40">/ {{ ring.goal }}</text>
              </view>
            </view>
          }
        </view>
      </view>

      <view class="mt-3 flex-row gap-3">
        @for (stat of stats; track stat.label) {
          <view class="flex-1 rounded-3xl bg-white p-4 shadow-sm">
            <ng-icon [name]="stat.icon" size="20" [color]="stat.color" />
            <text class="mt-3 text-lg font-bold text-zinc-950">{{ stat.value }}</text>
            <text class="text-xs font-medium text-zinc-500">{{ stat.label }}</text>
          </view>
        }
      </view>

      <view class="mt-3 h-[300px] overflow-hidden rounded-[30px] bg-[#e9eef2]">
        <view class="absolute -top-6 -left-8 h-28 w-40 rounded-[48px] bg-[#cfe6c6]"></view>
        <view class="absolute -right-10 bottom-14 h-24 w-44 rounded-[48px] bg-[#cfe2f3]"></view>
        @for (street of streets; track $index) {
          <view
            class="absolute rounded-full bg-white"
            [style.left.px]="street.left"
            [style.top.px]="street.top"
            [style.width.px]="street.width"
            [style.height.px]="street.height"
            [style.transform]="'rotate(' + street.angle + 'deg)'"
          ></view>
        }

        @for (segment of route; track $index) {
          <view
            class="absolute rounded-full bg-[#ff4d1a]"
            [style.left.px]="segment.left"
            [style.top.px]="segment.top"
            [style.width.px]="segment.width"
            [style.height.px]="line"
            [style.transform]="'rotate(' + segment.angle + 'deg)'"
          ></view>
        }
        @for (point of joints; track $index) {
          <view
            class="absolute rounded-full bg-[#ff4d1a]"
            [style.left.px]="point[0] - line / 2"
            [style.top.px]="point[1] - line / 2"
            [style.width.px]="line"
            [style.height.px]="line"
          ></view>
        }
        <view
          class="absolute size-4 rounded-full border-[3px] border-white bg-emerald-500"
          [style.left.px]="start[0] - 8"
          [style.top.px]="start[1] - 8"
        ></view>
        <view
          class="absolute size-9 rounded-full bg-[#ff4d1a]/25"
          [style.left.px]="end[0] - 18"
          [style.top.px]="end[1] - 18"
        ></view>
        <view
          class="absolute size-4 rounded-full border-[3px] border-white bg-[#ff4d1a]"
          [style.left.px]="end[0] - 8"
          [style.top.px]="end[1] - 8"
        ></view>

        <view
          class="absolute inset-x-3 bottom-3 flex-row items-center justify-between rounded-[22px] bg-white/95 px-4 py-3"
        >
          <view>
            <text class="text-[11px] font-bold tracking-[1.5px] text-[#ff4d1a]">EVENING RUN</text>
            <text class="text-xl font-bold text-zinc-950">5.24 km</text>
          </view>
          <view class="flex-row gap-4">
            @for (split of splits; track split.label) {
              <view class="items-end">
                <text class="text-sm font-bold text-zinc-950">{{ split.value }}</text>
                <text class="text-[11px] text-zinc-500">{{ split.label }}</text>
              </view>
            }
          </view>
        </view>
      </view>
    </view>
  `,
})
export default class Fitness {
  protected readonly line = LINE;
  protected readonly start = ROUTE[0]!;
  protected readonly end = ROUTE[ROUTE.length - 1]!;
  protected readonly joints = ROUTE;
  /** Each leg of the route as a bar, centred on its midpoint and turned to its angle. */
  protected readonly route = ROUTE.slice(1).map(([x2, y2], index) => {
    const [x1, y1] = ROUTE[index]!;
    const width = Math.hypot(x2 - x1, y2 - y1);
    return {
      left: (x1 + x2) / 2 - width / 2,
      top: (y1 + y2) / 2 - LINE / 2,
      width,
      angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
    };
  });
  protected readonly streets = [
    { left: -20, top: 176, width: 420, height: 10, angle: -8 },
    { left: -20, top: 84, width: 420, height: 7, angle: 4 },
    { left: 60, top: 140, width: 300, height: 7, angle: 72 },
    { left: -60, top: 140, width: 300, height: 10, angle: -64 },
    { left: 150, top: 140, width: 300, height: 6, angle: 58 },
  ];
  protected readonly rings = [
    {
      name: 'MOVE',
      value: '452',
      goal: '600 kcal',
      color: '#fa114f',
      track: '#fa114f33',
      inset: 0,
      full: true,
    },
    {
      name: 'EXERCISE',
      value: '15',
      goal: '30 min',
      color: '#a6ff00',
      track: '#a6ff0033',
      inset: 16,
      full: false,
    },
    {
      name: 'STAND',
      value: '9',
      goal: '12 hr',
      color: '#00f0ff',
      track: '#00f0ff33',
      inset: 32,
      full: true,
    },
  ];
  protected readonly stats = [
    { label: 'Steps', value: '8,241', icon: 'lucideFootprints', color: '#7c3aed' },
    { label: 'Avg heart', value: '142 bpm', icon: 'lucideHeartPulse', color: '#e11d48' },
    { label: 'Active', value: '1h 12m', icon: 'lucideTimer', color: '#0891b2' },
  ];
  protected readonly splits = [
    { label: 'Time', value: '28:14' },
    { label: 'Pace', value: '5\'23"' },
  ];

  constructor() {
    inject(StatusBar).set({ style: 'dark' });
  }
}

/** A whole screen. */
export const height = 874;
