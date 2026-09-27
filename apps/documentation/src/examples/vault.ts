/*
 * One of the landing page's three hero apps: a dark banking home screen. Glows are radial
 * gradients, the card a linear one, the icons native SVG - all Tailwind classes, all real views.
 * Photographed on the iOS simulator and the Android emulator; see the landing README.
 */
import { Component, inject } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownLeft,
  lucideArrowUpRight,
  lucideBell,
  lucideChartPie,
  lucideCreditCard,
  lucideHouse,
  lucideLayoutGrid,
  lucideNfc,
  lucidePlus,
  lucideUser,
} from '@ng-icons/lucide';
import { Text, View } from '@ng-native/components';
import { StatusBar } from '@ng-native/device';
import { NgIcon } from '@ng-native/icons';

@Component({
  selector: 'app-vault',
  imports: [NgIcon, Text, View],
  providers: [
    provideIcons({
      lucideArrowDownLeft,
      lucideArrowUpRight,
      lucideBell,
      lucideChartPie,
      lucideCreditCard,
      lucideHouse,
      lucideLayoutGrid,
      lucideNfc,
      lucidePlus,
      lucideUser,
    }),
  ],
  template: `
    <view class="flex-1 bg-[#09090f] px-5 pt-16">
      <view
        class="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,0.55),transparent_60%)]"
      ></view>
      <view
        class="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_95%_20%,rgba(244,63,94,0.35),transparent_55%)]"
      ></view>

      <view class="flex-row items-center justify-between">
        <view class="flex-row items-center gap-3">
          <view
            class="size-11 items-center justify-center rounded-full bg-linear-to-br from-violet-400 to-rose-400"
          >
            <text class="font-bold text-white">AL</text>
          </view>
          <view>
            <text class="text-xs text-white/50">Welcome back</text>
            <text class="text-base font-semibold text-white">Ada Lovelace</text>
          </view>
        </view>
        <view
          class="size-11 items-center justify-center rounded-full border border-white/10 bg-white/10"
        >
          <ng-icon name="lucideBell" size="20" color="#ffffff" />
        </view>
      </view>

      <text class="mt-7 text-sm text-white/50">Total balance</text>
      <view class="mt-1 flex-row items-end">
        <text class="text-[46px] font-bold tracking-tight text-white">£48,210</text>
        <text class="mb-2 text-2xl font-semibold text-white/40">.36</text>
      </view>
      <view class="mt-2 flex-row items-center gap-2">
        <view class="rounded-full bg-emerald-400/15 px-2.5 py-1">
          <text class="text-xs font-semibold text-emerald-300">▲ 2.4%</text>
        </view>
        <text class="text-xs text-white/40">vs last month</text>
      </view>

      <view class="mt-6">
        <view class="absolute inset-x-5 -top-3 h-48 rounded-[28px] bg-white/10"></view>
        <view
          class="h-48 justify-between overflow-hidden rounded-[28px] bg-linear-to-br from-violet-500 via-fuchsia-500 to-orange-400 p-5"
        >
          <view
            class="absolute -right-10 -bottom-16 size-56 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.35),transparent_65%)]"
          ></view>
          <view class="flex-row items-center justify-between">
            <text class="text-lg font-bold tracking-wide text-white">vault</text>
            <ng-icon name="lucideNfc" size="22" color="#ffffff" />
          </view>
          <view class="h-8 w-11 rounded-md bg-amber-200/80"></view>
          <view class="flex-row items-end justify-between">
            <view>
              <text class="text-xs text-white/70">Ada Lovelace</text>
              <text class="mt-1 text-base font-semibold tracking-[3px] text-white">
                •••• 4821
              </text>
            </view>
            <text class="text-xl font-extrabold text-white italic">VISA</text>
          </view>
        </view>
      </view>

      <view class="mt-6 flex-row justify-between px-1">
        @for (action of actions; track action.label) {
          <view class="items-center gap-2">
            <view
              class="size-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.07]"
            >
              <ng-icon [name]="action.icon" size="22" color="#ffffff" />
            </view>
            <text class="text-xs font-medium text-white/60">{{ action.label }}</text>
          </view>
        }
      </view>

      <view class="mt-5 rounded-[28px] border border-white/10 bg-white/[0.05] px-5 pt-4 pb-3">
        <view class="flex-row items-center justify-between">
          <text class="text-base font-semibold text-white">Spending</text>
          <text class="text-xs text-white/40">This week</text>
        </view>
        <view class="mt-3 h-[72px] flex-row items-end justify-between">
          @for (day of week; track $index) {
            <view class="items-center gap-2">
              <view
                class="w-7 rounded-lg"
                [class]="
                  day.today ? 'bg-linear-to-t from-fuchsia-500 to-orange-300' : 'bg-white/15'
                "
                [style.height.px]="day.spent"
              ></view>
              <text class="text-[11px]" [class]="day.today ? 'text-white' : 'text-white/40'">
                {{ day.name }}
              </text>
            </view>
          }
        </view>
      </view>

      <view
        class="absolute inset-x-12 bottom-7 h-16 flex-row items-center justify-around rounded-full border border-white/10 bg-[#1b1a24]/95"
      >
        @for (tab of tabs; track tab) {
          <view
            class="size-11 items-center justify-center rounded-full"
            [class]="$first ? 'bg-white' : ''"
          >
            <ng-icon [name]="tab" size="20" [color]="$first ? '#09090f' : '#ffffff80'" />
          </view>
        }
      </view>
    </view>
  `,
})
export default class Vault {
  protected readonly tabs = ['lucideHouse', 'lucideCreditCard', 'lucideChartPie', 'lucideUser'];
  protected readonly actions = [
    { label: 'Send', icon: 'lucideArrowUpRight' },
    { label: 'Request', icon: 'lucideArrowDownLeft' },
    { label: 'Top up', icon: 'lucidePlus' },
    { label: 'More', icon: 'lucideLayoutGrid' },
  ];
  protected readonly week = [
    { name: 'M', spent: 34, today: false },
    { name: 'T', spent: 52, today: false },
    { name: 'W', spent: 28, today: false },
    { name: 'T', spent: 60, today: false },
    { name: 'F', spent: 42, today: false },
    { name: 'S', spent: 64, today: true },
    { name: 'S', spent: 20, today: false },
  ];

  constructor() {
    inject(StatusBar).set({ style: 'light' });
  }
}

/** A whole screen. */
export const height = 874;
