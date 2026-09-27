import { Component, signal } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader, NativeHeaderItem } from '@ng-native/router';
import { page } from '../screen-styles.ts';

/**
 * The navigation bar itself: an inline title, an iOS large title, and action items in either
 * slot. Every control here binds straight to a `<native-header>` input, so what changes on
 * screen is UIKit reacting to a prop rather than anything redrawn in JavaScript.
 */
@Component({
  selector: 'x-header',
  imports: [NativeHeader, NativeHeaderItem, Pressable, ScrollView, Text, View],
  template: `
    <native-header
      title="Header"
      backTitle="Back"
      [largeTitle]="large()"
      [hideShadow]="!shadow()"
      [translucent]="translucent()"
      [titleColor]="tinted() ? '#3b6ef5' : undefined"
      [color]="tinted() ? '#f5a03b' : undefined"
    >
      <native-header-item type="right">
        <pressable
          [style]="item"
          (press)="star()"
          accessibilityRole="button"
          accessibilityLabel="Star this page"
          [accessibilityState]="{ selected: starred() }"
        >
          <text [style]="action">{{ starred() ? '★' : '☆' }}</text>
        </pressable>
        <pressable
          [style]="item"
          (press)="large.set(!large())"
          accessibilityRole="button"
          accessibilityLabel="Toggle the large title"
        >
          <text [style]="action">Aa</text>
        </pressable>
      </native-header-item>
    </native-header>

    <scroll-view
      class="screen"
      contentInsetAdjustmentBehavior="automatic"
      [contentContainerStyle]="page.content"
    >
      <text class="hint">
        The title is inline by default, which is the plain UIKit navigation bar. A large title
        collapses into it as this list scrolls, so scroll up to watch it happen.
      </text>

      <view [style]="page.row">
        <text class="body">Starred:</text>
        <text class="strong">{{ starred() ? 'yes' : 'no' }}</text>
        <text class="hint">tap the star in the bar</text>
      </view>

      <pressable class="button" (press)="large.set(!large())">
        <text class="button-label">{{ large() ? 'inline title' : 'large title' }}</text>
      </pressable>

      <pressable class="card" (press)="shadow.set(!shadow())">
        <text class="button-label">{{ shadow() ? 'hide the hairline' : 'show the hairline' }}</text>
      </pressable>

      <pressable class="card" (press)="translucent.set(!translucent())">
        <text class="button-label">
          {{ translucent() ? 'opaque bar' : 'translucent bar' }}
        </text>
      </pressable>

      <pressable class="card" (press)="tinted.set(!tinted())">
        <text class="button-label">{{ tinted() ? 'default colours' : 'tint the bar' }}</text>
      </pressable>

      <text class="hint">
        Two pressables share one right-hand item: a header item lays its children out in a row, so
        several actions fit in one slot. A left item would replace the back button, and a back item
        replaces just the chevron, which needs backButtonInCustomView on the header.
      </text>

      @for (row of filler; track row) {
        <text class="hint">{{ row }}</text>
      }
    </scroll-view>
  `,
})
export class Header {
  protected readonly page = page;
  protected readonly item = { paddingHorizontal: 6 };
  protected readonly action = { color: '#3b6ef5', fontSize: 18, fontWeight: '600' };

  protected readonly large = signal(false);
  protected readonly shadow = signal(true);
  protected readonly translucent = signal(false);
  protected readonly tinted = signal(false);
  protected readonly starred = signal(false);

  /** Enough content to scroll, which is the only way to see a large title collapse. */
  protected readonly filler = Array.from({ length: 20 }, (_, i) => `scroll me, line ${i + 1}`);

  protected star(): void {
    this.starred.update((on) => !on);
  }
}
