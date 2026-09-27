/**
 * Fixture for `layout-frame.test.ts`. See `button-app.ts`'s doc comment for why a real
 * `@Component` has to live in its own file rather than inside a `.test.ts` one.
 *
 * Exists to exercise `(layout)`'s `x`/`y` on their own. A consumer of `.y` - anything placing
 * content against a row, such as a list scrolling to a message - wants it in the parent's
 * coordinates, the way native's `onLayout` reports it - not the viewport's, the way `measure()`'s
 * frame is. `inner` is nested one level
 * inside `outer` for exactly that reason: a frame relative to `outer` is a different number from
 * one relative to the viewport whenever `outer` itself is not at the viewport's origin, which is
 * the case this fixture's test puts it in.
 */
import { Component, signal } from '@angular/core';
import { View, type LayoutEvent } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [View],
  template: `
    <view id="outer">
      <view id="inner" (layout)="onLayout($event)"></view>
    </view>
  `,
})
export class LayoutFrameApp {
  readonly frame = signal<{ x: number; y: number; width: number; height: number } | null>(null);

  protected onLayout(event: LayoutEvent): void {
    this.frame.set(event.nativeEvent.layout);
  }
}
