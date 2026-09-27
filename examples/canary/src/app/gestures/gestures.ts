import { Component, inject, signal } from '@angular/core';
import { Pressable, ScrollView, Text, TouchableOpacity, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { Engine } from '@ng-native/fabric';
import { CaptureGuard, Slider } from './slider.ts';
import { page } from '../screen-styles.ts';

@Component({
  selector: 'x-gestures',
  imports: [
    NativeHeader,
    ScrollView,
    Pressable,
    TouchableOpacity,
    Slider,
    CaptureGuard,
    Text,
    View,
  ],
  template: `
    <native-header title="Gestures" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="body"
        >taps: <text class="strong">{{ taps() }}</text> - last:
        <text class="strong">{{ last() }}</text></text
      >

      <pressable class="button" (press)="tap('pressable')">
        <text class="button-label">tap me (pressable)</text>
      </pressable>

      <touchable-opacity class="card" (press)="tap('touchable-opacity')">
        <text class="button-label">tap me (touchable-opacity)</text>
      </touchable-opacity>
      <pressable
        class="card"
        [hitSlop]="20"
        [delayLongPress]="400"
        (press)="tap('press')"
        (longPress)="tap('long press')"
      >
        <text class="button-label">hold me (long press), or tap just outside</text>
      </pressable>
      <text class="body" pressable (press)="tap('text')">a pressable text run</text>

      <text class="hint">
        Drag the slider: it blocks the scroll view and refuses to hand the gesture back. Lock it and
        an ancestor pre-empts it in the capture pass.
      </text>
      <text class="body"
        >slider: <text class="strong">{{ value().toFixed(2) }}</text></text
      >
      <view [captureGuard]="locked()">
        <x-slider [(value)]="value" />
      </view>
      <pressable class="card" (press)="locked.set(!locked())">
        <text class="button-label">{{ locked() ? 'capture ON' : 'capture OFF' }}</text>
      </pressable>

      <text class="hint">
        Drag starting on a button scrolls the page and must not fire a press.
      </text>
    </scroll-view>
  `,
})
export class Gestures {
  protected readonly page = page;
  protected readonly taps = signal(0);
  protected readonly last = signal('nothing yet');
  protected readonly value = signal(0.35);
  protected readonly locked = signal(false);
  protected readonly engine = inject(Engine);

  protected tap(source: string): void {
    this.taps.update((n) => n + 1);
    this.last.set(source);
  }
}
