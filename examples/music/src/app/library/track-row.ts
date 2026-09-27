import { Component, computed, input } from '@angular/core';
import { Image, Text, View } from '@ng-native/components';
import { formatDuration, type Album, type Track } from '../catalogue/catalogue.ts';

/** One track: artwork, title, artist and album, and its length. Highlights while it is playing. */
@Component({
  selector: 'app-track-row',
  imports: [Image, Text, View],
  template: `
    <view class="flex-row items-center gap-3">
      <image [source]="album().artwork" class="size-11 rounded-lg" resizeMode="cover" />
      <view class="flex-1">
        <text
          class="font-semibold"
          [class]="playing() ? 'text-rose-600' : 'text-zinc-900 dark:text-white'"
          numberOfLines="1"
          >{{ track().title }}</text
        >
        <text class="text-xs text-zinc-500 dark:text-zinc-400" numberOfLines="1">{{
          detail()
        }}</text>
      </view>
      <text class="text-xs text-zinc-400 dark:text-zinc-500">{{ length() }}</text>
    </view>
  `,
})
export class TrackRow {
  readonly track = input.required<Track>();
  readonly album = input.required<Album>();
  readonly playing = input(false);

  protected readonly detail = computed(() => `${this.track().artist} · ${this.album().title}`);
  protected readonly length = computed(() => formatDuration(this.track().duration));
}
