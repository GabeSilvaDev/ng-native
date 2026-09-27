/**
 * Platform capability: React Native's animation graph.
 *
 * React Native's `Animated` is worth reusing rather than reimplementing. Of the 45 files in
 * `Libraries/Animated`, only 11 touch React, and all of them are the `components/*` wrappers,
 * `createAnimatedComponent` and the hooks. The graph itself - values, interpolations, styles,
 * timing, spring, decay, easing - and the native driver bridge are React-free.
 *
 * It is injected rather than imported for the same reason keyboard metrics are: the components
 * package stays runnable under Node, where React Native's Flow-typed source cannot even be
 * parsed, and a test can drive an animation without a device.
 *
 * Apps do not wire this at all: `AnimatedStyle` in `../animations.ts` carries it as its own
 * provider, so importing the directive is the whole setup. The token is what makes that possible
 * without the components package importing React Native, and what lets a test drive an animation
 * with no device.
 */
import { InjectionToken } from '@angular/core';

/** One element's animated props, for as long as that element is alive. */
export interface AnimatedPropsHandle {
  /** Start observing the values. Until this runs, nothing reports a frame. */
  attach(): void;
  /** Stop observing, and release the native side if it was driving. */
  detach(): void;
  /** The current values, flattened the way a style object is. */
  read(): Record<string, unknown>;
  /**
   * Tell the graph which view the native driver should write to, by react tag. Safe to call
   * before any animation starts: React Native connects then, or later when one goes native.
   */
  connect(tag: number): void;
}

export interface AnimationBackend {
  /**
   * Wrap a style that may contain animated values. `onFrame` fires on every frame the graph
   * advances in JavaScript, and never while the native driver owns the animation.
   */
  props(style: Record<string, unknown>, onFrame: () => void): AnimatedPropsHandle;
}

export const ANIMATION = new InjectionToken<AnimationBackend>('angular-native.animation');
