import { Component, input } from '@angular/core';
import { Image, Text, View } from '@ng-native/components';
import type { Album } from '../catalogue/catalogue.ts';

/** One album, in the library's horizontal row: artwork, title and artist. */
@Component({
  selector: 'app-album-card',
  imports: [Image, Text, View],
  template: `
    <view class="w-36">
      <image [source]="album().artwork" class="size-36 rounded-2xl" resizeMode="cover" />
      <text class="mt-2 font-semibold text-zinc-900 dark:text-white" numberOfLines="1">{{
        album().title
      }}</text>
      <text class="text-xs text-zinc-500 dark:text-zinc-400" numberOfLines="1">{{
        album().artist
      }}</text>
    </view>
  `,
})
export class AlbumCard {
  readonly album = input.required<Album>();
}
