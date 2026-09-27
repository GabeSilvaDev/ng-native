/**
 * Claiming a host node, for the elements navigation owns.
 *
 * The engine reports any registered element name that reaches a commit without a component
 * behind it, which is how a template that forgot an import is caught. Navigation's elements need
 * the same treatment for the opposite reason: the outlet creates a `screen` itself, and the
 * header components own theirs, so both are accounted for rather than reported.
 *
 * This duplicates a few lines of the components package on purpose. `@nx/enforce-module-boundaries`
 * keeps the Angular-facing packages from reaching into each other, and a package dependency is a
 * heavier price than the copy.
 */
import { claimHost, type EngineNode } from '@ng-native/fabric';

/**
 * Mark `node` as owned, and take off any prop Angular wrote there from a static attribute that
 * one of `directive`'s inputs already consumed: `<native-header title="Settings">` feeds the
 * input *and* writes a `title` attribute, and only the input's value should survive.
 */
export function ownHost<T>(node: T, directive?: unknown): T {
  claimHost(node as EngineNode);
  if (directive) {
    const def = (directive as { ɵcmp?: { inputs?: object } }).ɵcmp;
    for (const name of Object.keys(def?.inputs ?? {})) delete (node as EngineNode).props[name];
  }
  return node;
}
