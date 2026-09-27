import { Component, inject } from '@angular/core';
import {
  Pressable,
  SafeAreaProvider,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@ng-native/components';
import { NativeNavigation } from '@ng-native/router';
import { page } from '../screen-styles.ts';

/**
 * What `present()` opens, and the reason it is a different page from the pushed one.
 *
 * `RNSScreenStack.mm` presents a modal screen with `presentViewController:`, so it is not inside
 * the stack's `UINavigationController` at all. There is no navigation bar for a
 * `<native-header>` to configure, and no navigation controller adjusting insets either, so a
 * presented screen owns its own chrome: its title, its way out, and its safe area. That is the
 * same shape react-navigation ends up with, where a modal needs a stack nested inside it before
 * it has a header.
 */
@Component({
  selector: 'x-sheet',
  imports: [Pressable, SafeAreaProvider, SafeAreaView, ScrollView, Text, View],
  template: `
    <!-- Its own provider: a presented screen is outside the stack's view tree, so the one at the
         app's root is not above it and the view below would inset by nothing. It does not report,
         because the app's safe area is still the app's while a sheet is over it. -->
    <safe-area-provider [reportInsets]="false" class="screen">
      <!-- Top for the chrome this page draws itself, bottom for the home indicator. Left and
           right are off: a sheet is inset from them already. -->
      <safe-area-view class="screen" [edges]="['top', 'bottom']">
        <view class="bar" [style]="bar">
          <pressable
            [style]="closeButton"
            (press)="close()"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <text [style]="action">Close</text>
          </pressable>
          <text class="heading" [style]="title">Presented</text>
        </view>
        <scroll-view class="screen" [contentContainerStyle]="page.content">
          <text class="body">
            A presented screen is outside the navigation controller, so it has no native bar and no
            back button. Everything above the divider is this page's own.
          </text>
          <text class="hint">
            As a sheet it also drags to dismiss, and the dismissal reaches the router as a back
            rather than leaving the URL pointing at a screen that is gone. Full screen it does not,
            which is why Close is the only way out of that one.
          </text>
        </scroll-view>
      </safe-area-view>
    </safe-area-provider>
  `,
  styles: `
    .bar {
      border-bottom-color: var(--line);
    }
  `,
})
export class Sheet {
  protected readonly page = page;
  protected readonly bar = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  };
  /** Dismiss goes on the left, where iOS puts Cancel on a sheet it presented. */
  protected readonly closeButton = { padding: 4, width: 60 };
  /** Centred by giving the title the same margin on the right as the button takes on the left. */
  protected readonly title = { flex: 1, textAlign: 'center', marginRight: 60 };
  protected readonly action = { color: '#3b6ef5', fontSize: 16, fontWeight: '600' };

  private readonly nav = inject(NativeNavigation);

  protected close(): void {
    this.nav.back();
  }
}
