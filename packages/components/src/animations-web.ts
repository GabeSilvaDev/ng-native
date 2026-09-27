/**
 * `animations.ts`, for a browser build.
 *
 * A web bundler resolves `@ng-native/components/animations` here, through the `browser`
 * condition in this package's `exports`; Metro, on a device, never sets that condition and gets
 * the native file. The names are the same on both sides, so the component that imports
 * `AnimatedStyle`, `Animated` and `Easing` from there is one component on both platforms.
 *
 * Nothing here reaches React Native. The graph is `animated.ts`, stepped by
 * `requestAnimationFrame`, and every frame is written through `setProp(node, 'style', ...)` by the
 * same directive the device uses.
 */
import { Directive } from '@angular/core';
import { animationBackend } from './animated.ts';
import { AnimatedStyleBase } from './animated-style.ts';
import { ANIMATION } from './animation.ts';

export { Animated } from './animated.ts';
export { Easing } from './easing.ts';

@Directive({
  selector: '[animatedStyle]',
  providers: [{ provide: ANIMATION, useValue: animationBackend }],
})
export class AnimatedStyle extends AnimatedStyleBase {}
