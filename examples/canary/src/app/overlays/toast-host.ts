import { Component, inject } from '@angular/core';
import { ActivityIndicator, Pressable, Text, View } from '@ng-native/components';
import { FullWindowOverlay } from '@ng-native/router';
import { Toasts } from './toasts.ts';

/** Last in the root template: the toast and the loading cover, above every screen and sheet. */
@Component({
  selector: 'x-toast-host',
  imports: [ActivityIndicator, FullWindowOverlay, Pressable, Text, View],
  template: `
    <full-window-overlay>
      @if (toasts.loading()) {
        <view class="cover" accessibilityRole="progressbar" accessibilityLabel="Loading">
          <activity-indicator size="large" />
        </view>
      }
      @if (toasts.message(); as message) {
        <pressable
          class="toast"
          accessibilityRole="alert"
          [accessibilityLabel]="message"
          (press)="toasts.dismiss()"
        >
          <text class="toast-label">{{ message }}</text>
        </pressable>
      }
    </full-window-overlay>
  `,
  styles: `
    .cover {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.35);
    }
    .toast {
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 48px;
      padding: 14px;
      border-radius: 12px;
      background-color: rgb(40, 40, 48);
    }
    .toast-label {
      color: rgb(255, 255, 255);
    }
  `,
})
export class ToastHost {
  protected readonly toasts = inject(Toasts);
}
