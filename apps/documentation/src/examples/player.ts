/*
 * One of the landing page's three hero apps: a music player. The album art is drawn, not loaded -
 * a sunset of gradients cut by bars - and the scrubber and controls are plain views and native
 * SVG icons. Photographed on the iOS simulator and the Android emulator; see the landing README.
 */
import { Component, inject } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideEllipsis,
  lucideHeadphones,
  lucideHeart,
  lucideListMusic,
  lucidePause,
  lucideRepeat,
  lucideShuffle,
  lucideSkipBack,
  lucideSkipForward,
} from '@ng-icons/lucide';
import { Text, View } from '@ng-native/components';
import { StatusBar } from '@ng-native/device';
import { NgIcon } from '@ng-native/icons';

@Component({
  selector: 'app-player',
  imports: [NgIcon, Text, View],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucideEllipsis,
      lucideHeadphones,
      lucideHeart,
      lucideListMusic,
      lucidePause,
      lucideRepeat,
      lucideShuffle,
      lucideSkipBack,
      lucideSkipForward,
    }),
  ],
  template: `
    <view class="flex-1 bg-linear-to-b from-[#4a0d33] via-[#1d0b33] to-[#08070d] px-6 pt-16">
      <view
        class="absolute inset-x-0 top-24 h-[480px] bg-[radial-gradient(circle_at_50%_45%,rgba(255,102,64,0.45),transparent_62%)]"
      ></view>

      <view class="flex-row items-center justify-between">
        <ng-icon name="lucideChevronDown" size="26" color="#ffffff" />
        <view class="items-center">
          <text class="text-[10px] font-semibold tracking-[2px] text-white/50">PLAYING FROM</text>
          <text class="text-sm font-semibold text-white">Late Night Drive</text>
        </view>
        <ng-icon name="lucideEllipsis" size="24" color="#ffffff" />
      </view>

      <view
        class="mt-6 aspect-square w-full overflow-hidden rounded-[32px] bg-linear-to-b from-[#ff7a45] via-[#e6397a] to-[#3a1c71] shadow-2xl shadow-rose-500/50"
      >
        <view
          class="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(circle_at_50%_100%,rgba(255,214,120,0.55),transparent_70%)]"
        ></view>
        <view
          class="absolute top-[22%] left-1/2 -ml-[92px] size-[184px] rounded-full bg-linear-to-b from-[#ffe08a] via-[#ff9a5a] to-[#ff4f8b]"
        ></view>
        @for (band of bands; track band.top) {
          <view
            class="absolute inset-x-0 bg-[#c2336f]"
            [style.top.%]="band.top"
            [style.height.px]="band.height"
          ></view>
        }
        <view
          class="absolute inset-x-0 bottom-0 h-[38%] bg-linear-to-b from-[#3a1c71] to-[#170a33]"
        ></view>
        @for (line of grid; track line) {
          <view class="absolute inset-x-0 h-px bg-[#ff5fa2]/50" [style.bottom.%]="line"></view>
        }
      </view>

      <view class="mt-6 flex-row items-center justify-between">
        <view>
          <text class="text-2xl font-bold text-white">Midnight Signals</text>
          <text class="mt-1 text-base text-white/60">Lumen Park</text>
        </view>
        <ng-icon name="lucideHeart" size="26" color="#fb7185" />
      </view>

      <view class="mt-6">
        <view class="h-1 rounded-full bg-white/15">
          <view class="h-1 w-[42%] rounded-full bg-white"></view>
        </view>
        <view class="absolute top-[-4px] left-[42%] -ml-1.5 size-3 rounded-full bg-white"></view>
        <view class="mt-2 flex-row justify-between">
          <text class="text-xs text-white/50">1:42</text>
          <text class="text-xs text-white/50">-2:16</text>
        </view>
      </view>

      <view class="mt-5 flex-row items-center justify-between">
        <ng-icon name="lucideShuffle" size="22" color="#ffffff99" />
        <ng-icon name="lucideSkipBack" size="30" color="#ffffff" />
        <view class="size-20 items-center justify-center rounded-full bg-white">
          <ng-icon name="lucidePause" size="32" color="#14081f" />
        </view>
        <ng-icon name="lucideSkipForward" size="30" color="#ffffff" />
        <ng-icon name="lucideRepeat" size="22" color="#ffffff99" />
      </view>

      <view class="mt-5 flex-row items-center justify-between">
        <view class="flex-row items-center gap-2">
          <ng-icon name="lucideHeadphones" size="16" color="#fda4af" />
          <text class="text-xs font-semibold text-rose-300">AirPods Pro</text>
        </view>
        <ng-icon name="lucideListMusic" size="18" color="#ffffff99" />
      </view>

      <view class="mt-4 rounded-3xl bg-white/[0.07] px-5 py-4">
        <text class="text-[10px] font-semibold tracking-[2px] text-white/50">LYRICS</text>
        <text class="mt-1.5 text-lg leading-6 font-bold text-white"
          >And the city hums in neon,</text
        >
        <text class="text-lg leading-6 font-bold text-white/35">every light a call sign</text>
      </view>
    </view>
  `,
})
export default class Player {
  /** The bars that cut the sun, thickening towards the horizon. */
  protected readonly bands = [
    { top: 45, height: 3 },
    { top: 50, height: 5 },
    { top: 55, height: 7 },
  ];
  /** The floor's horizontal lines, closer together towards the horizon. */
  protected readonly grid = [4, 12, 21, 29, 35];

  constructor() {
    inject(StatusBar).set({ style: 'light' });
  }
}

/** A whole screen. */
export const height = 874;
