/**
 * Content drawn above every screen the app shows, sheets and modals included.
 *
 * ```html
 * <full-window-overlay>
 *   @if (toast(); as message) {
 *     <view class="toast"><text>{{ message }}</text></view>
 *   }
 * </full-window-overlay>
 * ```
 *
 * A native sheet or modal is presented above the app's root view, so an absolutely positioned
 * view at the root - the usual toast - is covered by the first sheet the user opens. On iOS this
 * is react-native-screens' `RNSFullWindowOverlay`, a window of its own above the app's, which
 * lets touches through wherever it has no content of its own, so it can stay mounted with
 * nothing in it. It fills the window, as `FullWindowOverlay.tsx` sizes it, and follows it through
 * a rotation. On Android, where a screen's presentation is drawn within the activity's own view,
 * it is a plain view filling the window, last in its parent so it draws on top; put it last in the
 * root component's template for that.
 */
import { Component, ElementRef, computed, inject, input } from '@angular/core';
import { Screen } from '@ng-native/device';
import type { EngineNode } from '@ng-native/fabric';
import { ownHost } from './own-host.ts';

@Component({
  selector: 'full-window-overlay',
  template: '<ng-content />',
  host: {
    '[style]': 'fill()',
    '[accessibilityContainerViewIsModal]': 'modal()',
    '[pointerEvents]': "'box-none'",
  },
})
export class FullWindowOverlay {
  private readonly screen = inject(Screen);

  /** iOS: VoiceOver stays inside the overlay while it is shown, as for a modal. */
  readonly modal = input(false);

  protected readonly fill = computed(() => {
    const { width, height } = this.screen.window();
    return { position: 'absolute', top: 0, left: 0, width, height };
  });

  constructor() {
    ownHost(inject(ElementRef).nativeElement as EngineNode, this.constructor);
  }
}
