/**
 * What a test gets for `@ng-native/components/gestures`.
 *
 * The real entry point reaches react-native-gesture-handler's and Reanimated's source, which is
 * React Native's Flow and TypeScript that Node cannot load, so a test of any component with a
 * `<gesture-root>` or a `[gesture]` in it failed to import before it ran. `ngNative()` resolves
 * the entry point here instead: the same selectors and the same `gesture` input, with no native
 * library behind them. `<gesture-root>` renders its content in a plain view, as it does on iOS,
 * and a `[gesture]` keeps its view from being collapsed, as the real one does; nothing is
 * attached, because there is no native side for a recogniser to live in.
 *
 * A test of what a gesture does calls its callbacks, found with `gestureOf`, or the component method
 * they call, directly.
 */
import { Component, Directive, ElementRef, inject, input } from '@angular/core';
import { claimHost, registerViewName, type HostNode } from '@ng-native/fabric';

export type GestureSpec = object;

export interface GestureTarget {
  readonly tag: number;
}

/** Where the view's gesture is kept for `gestureOf`: on the engine's node, as the real one is. */
const GESTURE = Symbol.for('ng-native.test-gesture');

@Directive({ selector: '[gesture]', host: { '[collapsable]': 'false' } })
export class NativeGesture {
  readonly gesture = input.required<GestureSpec>();

  constructor() {
    const node = inject(ElementRef).nativeElement as object;
    Object.defineProperty(node, GESTURE, { get: () => this.gesture(), configurable: true });
  }
}

@Component({ selector: 'gesture-root', template: '<ng-content />' })
export class GestureRoot {
  constructor() {
    registerViewName('gesture-root', 'RCTView', { flex: 1 });
    claimHost(inject(ElementRef).nativeElement as HostNode);
  }
}
