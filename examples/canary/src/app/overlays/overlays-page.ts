import { Component, inject, input } from '@angular/core';
import { Pressable, ScrollView, Text } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { Toasts } from './toasts.ts';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A toast and a loading cover, raised from a screen and from a sheet over it. */
@Component({
  selector: 'x-overlays',
  imports: [NativeHeader, Pressable, ScrollView, Text],
  template: `
    <native-header [title]="sheet() ? 'Sheet' : 'Overlays'" />
    <scroll-view class="screen" [contentContainerStyle]="content">
      <pressable class="button" accessibilityRole="button" (press)="toast()">
        <text class="button-label">Show a toast</text>
      </pressable>
      <pressable class="button" accessibilityRole="button" (press)="load()">
        <text class="button-label">Load for a moment</text>
      </pressable>
      @if (!sheet()) {
        <pressable class="button" accessibilityRole="button" (press)="openSheet()">
          <text class="button-label">Open a sheet</text>
        </pressable>
      }
    </scroll-view>
  `,
})
export class OverlaysPage {
  private readonly toasts = inject(Toasts);
  private readonly nav = inject(NativeNavigation);
  protected readonly content = { padding: 20, gap: 12 };
  /** From the route's data: this page, presented as a sheet over itself. */
  readonly sheet = input(false);

  protected toast(): void {
    this.toasts.show(this.sheet() ? 'Shown above the sheet' : 'Shown above the screen');
  }

  protected load(): void {
    void this.toasts.while(pause(1500)).then(() => this.toasts.show('Loaded'));
  }

  protected openSheet(): void {
    void this.nav.present('/overlays/sheet', { as: 'formSheet' });
  }
}
