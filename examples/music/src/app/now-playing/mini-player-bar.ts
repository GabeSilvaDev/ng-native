import { Component, computed, inject } from '@angular/core';
import { Image, Pressable, Text, View } from '@ng-native/components';
import { ColorScheme } from '@ng-native/device';
import { NgIcon } from '@ng-native/icons';
import { NativeNavigation, TabSafeAreaView } from '@ng-native/router';
import { Catalogue } from '../catalogue/catalogue.ts';
import { Playback } from '../player/playback.ts';

/**
 * Docked above the tab bar on every tab, once a track has ever played. Tapping the artwork or
 * title opens Now Playing; the play/pause button works without leaving the current screen.
 *
 * Each tab places one, pinned to its bottom edge, and tab-safe-area-view lifts it clear of the
 * bar by however tall the bar is on this device: the floating bar on iOS 26, the classic one
 * before it, the bottom navigation bar on Android. It has to be inside a tab to know.
 */
@Component({
  selector: 'app-mini-player-bar',
  imports: [Image, NgIcon, Pressable, TabSafeAreaView, Text, View],
  template: `
    @if (track(); as t) {
      <tab-safe-area-view [edges]="['bottom']">
        <view
          testID="mini-player"
          class="mx-3 mb-2 h-14 flex-row items-center gap-3 rounded-2xl bg-white/95 pr-3 pl-2 shadow-lg dark:bg-zinc-800/95"
        >
          <pressable
            class="flex-1 flex-row items-center gap-3"
            accessibilityRole="button"
            [accessibilityLabel]="'Now playing: ' + t.title"
            (press)="open()"
          >
            <image [source]="artwork()" class="size-10 rounded-lg" resizeMode="cover" />
            <view class="flex-1">
              <text class="text-sm font-semibold text-zinc-900 dark:text-white" numberOfLines="1">{{
                t.title
              }}</text>
              <text class="text-xs text-zinc-500 dark:text-zinc-400" numberOfLines="1">{{
                t.artist
              }}</text>
            </view>
          </pressable>
          <pressable
            class="size-9 items-center justify-center"
            accessibilityRole="button"
            [accessibilityLabel]="playback.playing() ? 'Pause' : 'Play'"
            (press)="playback.toggle()"
          >
            <ng-icon
              [name]="playback.playing() ? 'lucidePause' : 'lucidePlay'"
              [size]="22"
              color="#e11d48"
            />
          </pressable>
          <pressable
            class="size-9 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Next"
            [accessibilityState]="{ disabled: !playback.hasNext() }"
            (press)="playback.next()"
          >
            <ng-icon name="lucideSkipForward" [size]="20" [color]="skipColour()" />
          </pressable>
        </view>
      </tab-safe-area-view>
    }
  `,
})
export class MiniPlayerBar {
  protected readonly playback = inject(Playback);
  private readonly scheme = inject(ColorScheme);
  private readonly catalogue = inject(Catalogue);
  private readonly navigation = inject(NativeNavigation);

  /** The skip icon: the ink of the scheme, or muted when there is nothing to skip to. */
  protected readonly skipColour = computed(() => {
    const dark = this.scheme.current() === 'dark';
    if (!this.playback.hasNext()) return dark ? '#52525b' : '#a1a1aa';
    return dark ? '#fafafa' : '#18181b';
  });

  protected readonly track = this.playback.current;
  protected readonly artwork = computed(
    () => this.catalogue.album(this.track()?.albumId ?? '')?.artwork,
  );

  protected open(): void {
    void this.navigation.present(['/now-playing'], {
      as: 'formSheet',
      presentation: { sheetAllowedDetents: [1], sheetGrabberVisible: true },
    });
  }
}
