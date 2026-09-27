import { Component, inject } from '@angular/core';
import { Pressable, ScrollView, Text } from '@ng-native/components';
import { NativeHeader, NativeHeaderItem, NativeNavigation } from '@ng-native/router';
import { page } from '../screen-styles.ts';

/**
 * Whatever the navigation page pushed, replaced or presented. The "Done" button is a header
 * item, so it is a real subview in the bar's right slot rather than a bar button item: anything
 * Angular can render goes there, and presses arrive through the responder system as usual.
 */
@Component({
  selector: 'x-detail',
  imports: [NativeHeader, NativeHeaderItem, Pressable, ScrollView, Text],
  template: `
    <native-header title="Detail" backTitle="Back">
      <native-header-item type="right">
        <pressable (press)="close()" accessibilityRole="button" accessibilityLabel="Done">
          <text [style]="done">Done</text>
        </pressable>
      </native-header-item>
    </native-header>
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="body">
        Presented as a sheet this drags to dismiss, and the dismissal reaches the router as a back
        rather than leaving the URL pointing at a screen that is gone.
      </text>
    </scroll-view>
  `,
})
export class Detail {
  protected readonly page = page;
  protected readonly done = { color: '#3b6ef5', fontSize: 16, fontWeight: '600' };
  private readonly nav = inject(NativeNavigation);

  protected close(): void {
    this.nav.back();
  }
}
