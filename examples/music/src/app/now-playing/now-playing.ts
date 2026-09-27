import { Component, computed, inject } from '@angular/core';
import {
  Image,
  Pressable,
  SafeAreaProvider,
  SafeAreaView,
  Text,
  View,
} from '@ng-native/components';
import { ColorScheme } from '@ng-native/device';
import { NgIcon } from '@ng-native/icons';
import { NativeNavigation } from '@ng-native/router';
import { UiHost } from '@ng-native/expo/expo-ui-components';
import { Catalogue, formatDuration } from '../catalogue/catalogue.ts';
import { Playback } from '../player/playback.ts';

/**
 * The full player, presented as a sheet over whatever screen opened it (see mini-player-bar.ts).
 * A presented screen has no native header and no automatic safe-area insets, so it owns both.
 */
@Component({
  selector: 'app-now-playing',
  imports: [Image, NgIcon, Pressable, SafeAreaProvider, SafeAreaView, Text, UiHost, View],
  template: `
    <safe-area-provider [reportInsets]="false" [style]="fill">
      <safe-area-view
        testID="now-playing"
        class="flex-1 bg-white dark:bg-black"
        [edges]="['top', 'bottom']"
      >
        <view class="flex-row items-center justify-between px-4 pt-2">
          <pressable
            class="size-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Close"
            (press)="close()"
          >
            <ng-icon name="lucideChevronDown" [size]="24" [color]="ink()" />
          </pressable>
          <text class="text-xs font-semibold text-zinc-500 uppercase">Now playing</text>
          <view class="size-10"></view>
        </view>

        @if (track(); as t) {
          <view class="flex-1 justify-center px-8">
            <image
              [source]="album()!.artwork"
              class="aspect-square w-full self-center rounded-3xl"
              resizeMode="cover"
            />

            <view class="mt-8">
              <text class="text-2xl font-bold text-zinc-900 dark:text-white" numberOfLines="1">{{
                t.title
              }}</text>
              <text class="mt-1 text-base text-zinc-500 dark:text-zinc-400" numberOfLines="1">
                {{ t.artist }} · {{ album()!.title }}
              </text>
            </view>

            <ui-host style="height: 40" class="mt-6">
              <ui-slider
                [value]="progress()"
                accessibilityLabel="Seek"
                (valueChanged)="seek($event)"
              />
            </ui-host>
            <view class="-mt-2 flex-row justify-between">
              <text class="text-xs text-zinc-400">{{ elapsed() }}</text>
              <text class="text-xs text-zinc-400">{{ remaining() }}</text>
            </view>

            <view class="mt-6 flex-row items-center justify-between">
              <pressable
                class="size-11 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Shuffle"
                [accessibilityState]="{ selected: playback.shuffled() }"
                (press)="playback.toggleShuffle()"
              >
                <ng-icon name="lucideShuffle" [size]="20" [color]="accent(playback.shuffled())" />
              </pressable>
              <pressable
                class="size-14 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Previous"
                (press)="playback.previous()"
              >
                <ng-icon name="lucideSkipBack" [size]="28" [color]="ink()" />
              </pressable>
              <pressable
                class="size-16 items-center justify-center rounded-full bg-zinc-900 active:opacity-80 dark:bg-white"
                accessibilityRole="button"
                [accessibilityLabel]="playback.playing() ? 'Pause' : 'Play'"
                (press)="playback.toggle()"
              >
                <ng-icon
                  [name]="playback.playing() ? 'lucidePause' : 'lucidePlay'"
                  [size]="26"
                  [color]="onAccentInk()"
                />
              </pressable>
              <pressable
                class="size-14 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Next"
                (press)="playback.next()"
              >
                <ng-icon name="lucideSkipForward" [size]="28" [color]="ink()" />
              </pressable>
              <pressable
                class="size-11 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Repeat"
                [accessibilityState]="{ selected: playback.repeat() !== 'off' }"
                (press)="playback.cycleRepeat()"
              >
                <ng-icon
                  [name]="playback.repeat() === 'one' ? 'lucideRepeat1' : 'lucideRepeat'"
                  [size]="20"
                  [color]="accent(playback.repeat() !== 'off')"
                />
              </pressable>
            </view>
          </view>
        } @else {
          <view class="flex-1 items-center justify-center">
            <text class="text-zinc-500">Nothing playing</text>
          </view>
        }
      </safe-area-view>
    </safe-area-provider>
  `,
})
export class NowPlaying {
  protected readonly playback = inject(Playback);
  private readonly catalogue = inject(Catalogue);
  private readonly navigation = inject(NativeNavigation);
  private readonly scheme = inject(ColorScheme);

  protected readonly fill = { flex: 1 };
  protected readonly track = this.playback.current;
  protected readonly album = computed(() => this.catalogue.album(this.track()?.albumId ?? ''));
  protected readonly progress = this.playback.progress;
  protected readonly elapsed = computed(() => formatDuration(this.playback.state().currentTime));
  protected readonly remaining = computed(() => {
    const { currentTime, duration } = this.playback.state();
    return `-${formatDuration(Math.max(0, duration - currentTime))}`;
  });

  protected readonly ink = computed(() =>
    this.scheme.current() === 'dark' ? '#fafafa' : '#18181b',
  );
  protected readonly onAccentInk = computed(() =>
    this.scheme.current() === 'dark' ? '#18181b' : '#fafafa',
  );

  protected accent(active: boolean): string {
    return active ? '#e11d48' : this.scheme.current() === 'dark' ? '#71717a' : '#a1a1aa';
  }

  protected seek(event: { value: number }): void {
    this.playback.seekTo(event.value * this.playback.state().duration);
  }

  protected close(): void {
    this.navigation.back();
  }
}
