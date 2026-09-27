/**
 * A view whose padding - or margin - keeps its content clear of the notch, the status bar, the
 * home indicator, and on Android the display cutout and the navigation bar.
 *
 * The insets are applied natively, in the shadow node, so nothing crosses to JavaScript and there
 * is no frame where the content sits under the system's furniture before moving out from under
 * it. That is the reason to prefer this over reading `SafeArea.insets` and doing the arithmetic:
 * the arithmetic is a frame late and re-runs on every rotation.
 *
 * ```html
 * <safe-area-view [edges]="['top', 'bottom']" [style]="fill">…</safe-area-view>
 * ```
 *
 * Which edges matter is usually a subset. A screen in a native stack already has its header
 * covering the top, so it wants `bottom` alone; a presented sheet draws its own chrome and wants
 * both. Passing nothing insets all four, which is what React Native's own deprecated
 * `SafeAreaView` did.
 *
 * `maximum` is the third mode per edge and exists for a view that already has padding: `additive`
 * adds the inset to it, `maximum` takes whichever is larger, and `off` ignores that edge.
 *
 * The insets come from the nearest `<safe-area-provider>` above it in the native view tree. A
 * screen presented as a full-screen modal is not below the app's root provider - UIKit presents
 * it from a view controller of its own - so there the view finds no insets and sits under the
 * status bar. Such a screen wraps its content in a `<safe-area-provider>` of its own.
 *
 * The app must have `react-native-safe-area-context` installed, which is where the native
 * component comes from; none of its JavaScript is imported. React Native's own `SafeAreaView` is
 * deprecated in favour of it, is iOS-only, and offers no control over which edges apply.
 */
import { Directive, computed, input } from '@angular/core';
import { registerSafeAreaComponents, type SafeAreaEdge, type SafeAreaEdges } from './safe-area.ts';
import { ViewBase } from './view-base.ts';

/** How an edge combines with the padding already there. */
export type SafeAreaEdgeMode = 'additive' | 'maximum' | 'off';

const ALL: readonly SafeAreaEdge[] = ['top', 'right', 'bottom', 'left'];

@Directive({
  selector: 'safe-area-view',
  host: {
    '[edges]': 'resolvedEdges()',
    '[mode]': 'mode()',
  },
})
export class SafeAreaView extends ViewBase {
  constructor() {
    super();
    // Before the first commit of this element, which is this component's own.
    registerSafeAreaComponents();
  }

  /**
   * Which edges to inset: `['top', 'bottom']`, or a record for per-edge modes. Absent insets all
   * four.
   */
  readonly edges = input<SafeAreaEdges>();

  /** Whether the insets become padding, which is the default, or margin. */
  readonly mode = input<'padding' | 'margin'>();

  /**
   * Native takes all four edges every time - a partial record leaves the missing ones at whatever
   * they were, which reads as an inset that will not go away.
   */
  protected readonly resolvedEdges = computed(() => {
    const edges = this.edges();
    const given: Partial<Record<SafeAreaEdge, SafeAreaEdgeMode>> = Array.isArray(edges)
      ? Object.fromEntries(edges.map((edge) => [edge, 'additive']))
      : ((edges as Record<SafeAreaEdge, SafeAreaEdgeMode> | undefined) ?? {});

    const all = edges === undefined;
    return Object.fromEntries(
      ALL.map((edge) => [edge, all ? 'additive' : (given[edge] ?? 'off')]),
    ) as Record<SafeAreaEdge, SafeAreaEdgeMode>;
  });
}
