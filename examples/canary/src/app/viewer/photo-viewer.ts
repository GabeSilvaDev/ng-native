import { Component, computed, inject, input, linkedSignal, viewChildren } from '@angular/core';
import { Gesture } from 'react-native-gesture-handler';
import { Image, Pressable, ScrollView, Text, View } from '@ng-native/components';
import { GestureRoot, NativeGesture } from '@ng-native/components/gestures';
import { Screen } from '@ng-native/device';
import type { NativeSyntheticEvent } from '@ng-native/fabric';
import { NativeNavigation } from '@ng-native/router';
import { PHOTOS } from './photos.ts';

/**
 * Photos full screen: swipe between them, pinch or double-tap to zoom, pan a zoomed one, and swipe
 * down to put the viewer away, which the sheet it is presented in does natively. Each photo is a
 * zooming scroll view of its own inside a paging one; paging away from a zoomed photo zooms it
 * back out, as Photos does. It fills the window through a rotation.
 */
@Component({
  selector: 'x-photo-viewer',
  imports: [GestureRoot, Image, NativeGesture, Pressable, ScrollView, Text, View],
  template: `
    <gesture-root>
      <view class="viewer">
        <scroll-view
          [horizontal]="true"
          [pagingEnabled]="true"
          [showsHorizontalScrollIndicator]="false"
          [contentOffset]="start()"
          (momentumScrollEnd)="onPaged($event)"
        >
          @for (photo of photos; track photo.id; let i = $index) {
            <scroll-view
              #page
              [style]="pageSize()"
              [minimumZoomScale]="1"
              [maximumZoomScale]="4"
              [centerContent]="true"
              [bouncesZoom]="true"
              [showsVerticalScrollIndicator]="false"
              [showsHorizontalScrollIndicator]="false"
              [nativeID]="'page-' + i"
              (scroll)="onZoom(i, $event)"
            >
              <view [gesture]="doubleTap(i)">
                <image
                  [style]="pageSize()"
                  [source]="{ uri: photo.uri }"
                  resizeMode="contain"
                  [accessibilityLabel]="photo.title"
                />
              </view>
            </scroll-view>
          }
        </scroll-view>
        <view class="bar">
          <text class="label">{{ current() + 1 }} of {{ photos.length }}</text>
          <pressable accessibilityRole="button" (press)="close()">
            <text class="label">Done</text>
          </pressable>
        </view>
      </view>
    </gesture-root>
  `,
  styles: `
    .viewer {
      flex: 1;
      background-color: rgb(0, 0, 0);
    }
    .bar {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      flex-direction: row;
      justify-content: space-between;
    }
    .label {
      color: rgb(255, 255, 255);
      font-weight: 600;
    }
  `,
})
export class PhotoViewer {
  private readonly nav = inject(NativeNavigation);
  private readonly screen = inject(Screen);
  private readonly pages = viewChildren<ScrollView>('page');

  readonly index = input.required<string>();
  protected readonly photos = PHOTOS;
  protected readonly current = linkedSignal(() => Number(this.index()) || 0);
  protected readonly pageSize = computed(() => {
    const { width, height } = this.screen.window();
    return { width, height };
  });
  /**
   * Where the pager is: on the photo tapped when it opens, before the first frame, and on the
   * photo shown when the window changes size, so a rotation keeps it.
   */
  protected readonly start = computed(() => ({ x: this.current() * this.pageSize().width, y: 0 }));
  private readonly zoomed = new Set<number>();
  private readonly taps = new Map<number, ReturnType<typeof Gesture.Tap>>();

  /** Double tap: in to where the finger was, or back out if already in. */
  protected doubleTap(index: number): ReturnType<typeof Gesture.Tap> {
    let tap = this.taps.get(index);
    if (!tap) {
      const zoom = (x: number, y: number) => this.toggleZoom(index, x, y);
      tap = Gesture.Tap()
        .numberOfTaps(2)
        .runOnJS(true)
        .onEnd((event) => zoom(event.x, event.y));
      this.taps.set(index, tap);
    }
    return tap;
  }

  toggleZoom(index: number, x: number, y: number): void {
    const page = this.pages()[index];
    if (!page) return;
    const { width, height } = this.pageSize();
    if (this.zoomed.has(index)) {
      page.zoomToRect({ x: 0, y: 0, width, height });
      this.zoomed.delete(index);
    } else {
      page.zoomToRect({
        x: x - width / 6,
        y: y - height / 6,
        width: width / 3,
        height: height / 3,
      });
      this.zoomed.add(index);
    }
  }

  protected onZoom(index: number, event: NativeSyntheticEvent<{ zoomScale?: number }>): void {
    const scale = event.nativeEvent?.zoomScale ?? 1;
    if (scale > 1.01) this.zoomed.add(index);
    else this.zoomed.delete(index);
  }

  protected onPaged(event: NativeSyntheticEvent<{ contentOffset?: { x?: number } }>): void {
    const width = this.pageSize().width;
    if (!width) return;
    const next = Math.round((event.nativeEvent?.contentOffset?.x ?? 0) / width);
    const left = this.current();
    if (next === left) return;
    // The photo paged away from goes back to fitting the screen.
    if (this.zoomed.has(left)) {
      const { width: w, height } = this.pageSize();
      this.pages()[left]?.zoomToRect({ x: 0, y: 0, width: w, height }, false);
      this.zoomed.delete(left);
    }
    this.current.set(next);
  }

  protected close(): void {
    this.nav.back();
  }
}
