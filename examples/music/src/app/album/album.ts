import { Component, computed, inject, input } from '@angular/core';
import { Image, Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NgIcon } from '@ng-native/icons';
import { NativeHeader } from '@ng-native/router';
import { Catalogue } from '../catalogue/catalogue.ts';
import { TrackRow } from '../library/track-row.ts';
import { Playback } from '../player/playback.ts';

/** One album in full: artwork, its tracks, and a button to play them all from the top. */
@Component({
  selector: 'app-album-detail',
  imports: [Image, NativeHeader, NgIcon, Pressable, ScrollView, Text, TrackRow, View],
  template: `
    <native-header [title]="album()?.title ?? 'Album'" />
    <scroll-view
      class="flex-1 bg-zinc-100 dark:bg-black"
      contentInsetAdjustmentBehavior="automatic"
    >
      @if (album(); as a) {
        <view class="items-center gap-2 px-5 pt-6 pb-6">
          <image [source]="a.artwork" class="size-48 rounded-3xl" resizeMode="cover" />
          <text class="mt-3 text-xl font-bold text-zinc-900 dark:text-white">{{ a.title }}</text>
          <text class="text-sm text-zinc-500 dark:text-zinc-400">{{ a.artist }}</text>

          <pressable
            class="mt-4 flex-row items-center gap-2 rounded-full bg-rose-600 px-6 py-3 active:bg-rose-700"
            accessibilityRole="button"
            (press)="playAll()"
          >
            <ng-icon name="lucidePlay" [size]="16" color="#ffffff" />
            <text class="font-semibold text-white">Play all</text>
          </pressable>
        </view>

        <view testID="album-tracks" class="mx-4 mb-8 rounded-xl bg-white dark:bg-zinc-900">
          @for (track of tracks(); track track.id; let last = $last) {
            <pressable
              class="px-4 py-3 active:bg-zinc-100 dark:active:bg-zinc-800"
              [class]="last ? '' : 'border-b-hairline border-zinc-200 dark:border-zinc-800'"
              accessibilityRole="button"
              (press)="play(track.id)"
            >
              <app-track-row [track]="track" [album]="a" [playing]="isPlaying(track.id)" />
            </pressable>
          }
        </view>
      } @else {
        <text class="p-5 text-zinc-500">This album no longer exists.</text>
      }
    </scroll-view>
  `,
})
export class AlbumDetail {
  private readonly catalogue = inject(Catalogue);
  private readonly playback = inject(Playback);

  readonly id = input.required<string>();

  protected readonly album = computed(() => this.catalogue.album(this.id()));
  protected readonly tracks = computed(() => this.catalogue.tracksOf(this.id()));

  protected isPlaying(trackId: string): boolean {
    return this.playback.playing() && this.playback.current()?.id === trackId;
  }

  protected play(trackId: string): void {
    this.playback.playQueue(this.tracks(), trackId);
  }

  protected playAll(): void {
    this.playback.playQueue(this.tracks());
  }
}
