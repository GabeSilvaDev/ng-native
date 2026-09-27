/**
 * Everything an app needs to animate, in one provider.
 *
 * Deliberately outside the barrel: this file deep-imports React Native's
 * animation graph, which is Flow source that Node cannot parse. Keeping it here means the rest of
 * the package stays runnable under Node, which is what the whole test suite depends on. A browser
 * build never sees this file: the package's `exports` send it to `animations-web.ts` instead.
 *
 * ```ts
 * mount(rootTag, App, fabric, { providers: [provideAnimations()] });
 * ```
 *
 * Note what this cannot do. Angular decides whether `animate.enter` and `animate.leave` do
 * anything the moment `@angular/core` is evaluated, by reading a global; a provider runs long
 * after that, so those two need a Metro polyfill instead and no provider can stand in for it. The
 * `withAngularNative` preset adds it; this checks that it happened and says so if it did not.
 */
// @ts-expect-error React Native ships its internals as Flow, so the deep import has no types.
// The shape used here is declared just below; it is four methods.
import Untyped from 'react-native/Libraries/Animated/nodes/AnimatedProps';
import { Directive } from '@angular/core';
import { AnimatedStyleBase } from './animated-style.ts';
import { ANIMATION, type AnimationBackend } from './animation.ts';

// The graph an app builds its values from, under the names a browser build exports too (see
// `animations-web.ts`), so one import serves a component on both platforms.
export { Animated, Easing } from 'react-native';

/**
 * What `AnimatedProps` gives us. `setNativeView` takes anything `findNodeHandle` accepts, and
 * that includes a plain number, which is how an animated graph reaches one of our nodes with no
 * React instance in sight.
 */
interface AnimatedPropsNode {
  __attach(): void;
  __detach(): void;
  __getValue(): { style?: Record<string, unknown> };
  setNativeView(viewTag: number): void;
}

/**
 * `AnimatedProps` is what `createAnimatedComponent` uses, and there is no public equivalent.
 * Everything above it in that file is React, and none of it is wanted here.
 */
const AnimatedProps = Untyped as new (
  props: { [key: string]: unknown },
  callback: () => void,
) => AnimatedPropsNode;
const backend: AnimationBackend = {
  props: (style, onFrame) => {
    const props = new AnimatedProps({ style }, onFrame);
    return {
      attach: () => props.__attach(),
      detach: () => props.__detach(),
      read: () => props.__getValue().style ?? {},
      // A number is all `findNodeHandle` needs, so the graph can address one of our nodes with no
      // React instance anywhere. React Native connects the view now if an animation has already
      // gone native, and remembers the tag for the moment one does.
      connect: (tag) => props.setNativeView(tag),
    };
  },
};

@Directive({
  selector: '[animatedStyle]',
  providers: [{ provide: ANIMATION, useValue: backend }],
})
export class AnimatedStyle extends AnimatedStyleBase {}
