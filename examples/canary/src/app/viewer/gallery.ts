import { Component, inject } from '@angular/core';
import { Image, Pressable, ScrollView, View } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { PHOTOS } from './photos.ts';

/** A grid of photos, each opening the viewer on itself. */
@Component({
  selector: 'x-gallery',
  imports: [Image, NativeHeader, Pressable, ScrollView, View],
  template: `
    <native-header title="Photos" />
    <scroll-view class="screen" [contentContainerStyle]="grid">
      @for (photo of photos; track photo.id; let i = $index) {
        <pressable
          accessibilityRole="imagebutton"
          [accessibilityLabel]="photo.title"
          (press)="open(i)"
        >
          <image class="thumb" [source]="{ uri: photo.uri }" resizeMode="cover" />
        </pressable>
      }
    </scroll-view>
  `,
  styles: `
    .thumb {
      width: 124px;
      height: 124px;
    }
  `,
})
export class Gallery {
  private readonly nav = inject(NativeNavigation);
  protected readonly photos = PHOTOS;
  protected readonly grid = { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4 };

  protected open(index: number): void {
    void this.nav.present(['/photos', index], { as: 'pageSheet' });
  }
}
