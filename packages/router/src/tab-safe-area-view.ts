/**
 * A view that keeps its content clear of the tab bar, as well as the home indicator and the
 * system bars.
 *
 * ```html
 * <view class="panel absolute bottom-0 left-0 right-0">
 *   <tab-safe-area-view [edges]="['bottom']">…</tab-safe-area-view>
 * </view>
 * ```
 *
 * `<safe-area-view>` cannot do this. Its insets come from the nearest `<safe-area-provider>`,
 * which sits at the root of the app, above the tab bar, and so measures only the window's own
 * unsafe areas: inside a tab its bottom inset is the home indicator, and anything pinned to the
 * bottom of a tab ends up under the bar. On iOS 26 the bar floats over the screen's content, and
 * on Android the bottom navigation bar overlays it, so there is no layout that avoids it either.
 *
 * This is react-native-screens' own `RNSSafeAreaView`, which asks the screen it is in instead.
 * On iOS that is the tab screen's `safeAreaInsets`, which UIKit extends by the tab bar - floating
 * or not, and with the gap under a floating one - on top of the home indicator; a stack inside a
 * tab passes the same insets down to its pages. On Android it is the larger of the bottom
 * navigation bar's height and the system bars. Both follow the bar as it changes, rotates, or is
 * hidden.
 *
 * **The insets are applied as margin, not padding.** Whatever is beneath the inset shows through
 * it, so a panel whose background has to reach the bottom of the screen puts that background on
 * a parent and this inside it, as above: the parent grows by the margin and paints behind the
 * bar, and the content ends where the bar begins.
 *
 * It has to be inside a tab, or a page of a stack inside one. On iOS, with no screen above it, it
 * insets by nothing.
 */
import { Component, ElementRef, computed, inject, input } from '@angular/core';
import type { EngineNode } from '@ng-native/fabric';
import { ownHost } from './own-host.ts';

/** The edges of the screen. */
export type TabSafeAreaEdge = 'top' | 'right' | 'bottom' | 'left';

const ALL: readonly TabSafeAreaEdge[] = ['top', 'right', 'bottom', 'left'];

@Component({
  selector: 'tab-safe-area-view',
  template: '<ng-content />',
  host: { '[edges]': 'resolvedEdges()' },
})
export class TabSafeAreaView {
  constructor() {
    ownHost(inject(ElementRef).nativeElement as EngineNode, this.constructor);
  }

  /** Which edges to inset: usually `['bottom']`. Absent insets all four. */
  readonly edges = input<readonly TabSafeAreaEdge[]>();

  /**
   * Native takes all four edges every time, as booleans; a partial record leaves the missing
   * ones at whatever they were.
   */
  protected readonly resolvedEdges = computed(() => {
    const edges = this.edges() ?? ALL;
    return Object.fromEntries(ALL.map((edge) => [edge, edges.includes(edge)])) as Record<
      TabSafeAreaEdge,
      boolean
    >;
  });
}
