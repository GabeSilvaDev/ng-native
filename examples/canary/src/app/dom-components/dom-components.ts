import { Component, signal } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { DomComponent } from '@ng-native/expo/dom-component';
import { NativeHeader } from '@ng-native/router';
import signature from './signature.ts';
import { page } from '../screen-styles.ts';

/**
 * An Angular DOM component on a native screen: `signature.ts` is a `<canvas>` in a web view,
 * and everything around it is native. Its inputs are bound from here, and its outputs update this
 * screen's native text.
 */
@Component({
  selector: 'x-dom-components',
  imports: [NativeHeader, Pressable, ScrollView, Text, View, DomComponent],
  template: `
    <native-header title="DOM components" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="hint">
        The pad is an Angular component rendered by a browser, in a web view. The rest of the screen
        is native.
      </text>
      <dom-component
        [src]="signature"
        [style]="pad"
        [inputs]="{ name: name(), ink: ink() }"
        [outputs]="{ strokes: onStrokes, cleared: onCleared }"
      />
      <text class="body">{{ strokes() }} strokes (native text, from an output)</text>
      <view [style]="page.row">
        <pressable class="button" (press)="rename()">
          <text class="button-label">Change name</text>
        </pressable>
        <pressable class="button" (press)="recolour()">
          <text class="button-label">Change ink</text>
        </pressable>
      </view>
    </scroll-view>
  `,
})
export class DomComponentsPage {
  protected readonly page = page;
  protected readonly signature = signature;
  protected readonly pad = { height: 240 };
  protected readonly name = signal('Ada Lovelace');
  protected readonly ink = signal('#1c1c1e');
  protected readonly strokes = signal(0);

  protected readonly onStrokes = (count: number) => this.strokes.set(count);
  protected readonly onCleared = () => this.strokes.set(0);

  protected rename(): void {
    this.name.update((name) => (name === 'Ada Lovelace' ? 'Grace Hopper' : 'Ada Lovelace'));
  }

  protected recolour(): void {
    this.ink.update((ink) => (ink === '#1c1c1e' ? '#c4002d' : '#1c1c1e'));
  }
}
