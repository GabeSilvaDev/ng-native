/**
 * Platform capability: native gesture recognition, from react-native-gesture-handler.
 *
 * A gesture is recognised by the platform - a `UIPanGestureRecognizer`, an Android
 * `GestureDetector` - rather than by our own responder negotiation. That is what makes a drag
 * inside a scroll view behave, and what a pinch or a rotation needs to exist at all.
 *
 * Injected rather than imported for the reason everything in this shape is: the library reaches
 * React Native's Flow source, which Node cannot parse. `NativeGesture` in `../gestures.ts` carries
 * the real backend as its own provider, so importing the directive is the whole setup.
 */
import { InjectionToken } from '@angular/core';

/**
 * A gesture built by the library's own `Gesture` API: `Gesture.Pan()`, or a composition of
 * several. Opaque here on purpose - the shape is the library's, and this package does not know it.
 */
export type GestureSpec = object;

/** What a gesture is attached to: a node's react tag. */
export interface GestureTarget {
  readonly tag: number;
}

export interface GestureBackend {
  /** Attach `gesture` to `target`, and return the function that detaches it. */
  attach(target: GestureTarget, gesture: GestureSpec): () => void;
}

export const GESTURES = new InjectionToken<GestureBackend>('angular-native.gestures');
