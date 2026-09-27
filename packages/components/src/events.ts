/**
 * The `nativeEvent` payloads native sends, so a handler can be typed rather than cast.
 *
 * Events on a primitive are element events, bound with Angular's `(name)` syntax and routed by
 * the renderer to Fabric's `topName`, so `(layout)="onLayout($event)"` receives a
 * `NativeSyntheticEvent<LayoutPayload>`. Nothing here is emitted from a component: a listener the
 * component registered itself would opt every instance into events such as `topLayout`, which
 * native only sends when something asks.
 */
import type { NativeSyntheticEvent, TouchPayload } from '@ng-native/fabric';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Insets {
  readonly top?: number;
  readonly left?: number;
  readonly bottom?: number;
  readonly right?: number;
}

/** `(layout)`: the view's frame, in its parent's coordinates. Needs `onLayout` to be opted in. */
export interface LayoutPayload {
  readonly layout: Rect;
}
export type LayoutEvent = NativeSyntheticEvent<LayoutPayload>;

/** `(touchStart)`, `(touchMove)`, `(touchEnd)`, `(touchCancel)`. */
export interface TouchEventPayload extends TouchPayload {
  readonly touches?: readonly TouchPayload[];
  readonly changedTouches?: readonly TouchPayload[];
}
export type TouchEvent = NativeSyntheticEvent<TouchEventPayload>;

/** `(scroll)` and the drag and momentum events on a scroll view. */
export interface ScrollPayload {
  readonly contentOffset: Point;
  readonly contentSize: Size;
  readonly layoutMeasurement: Size;
  readonly contentInset: Required<Insets>;
  readonly zoomScale: number;
  /** Present on the drag-end and momentum events. */
  readonly velocity?: Point;
  readonly responderIgnoreScroll?: boolean;
  readonly targetContentOffset?: Point;
}
export type ScrollEvent = NativeSyntheticEvent<ScrollPayload>;

/** `(contentSizeChange)` on a scroll view: the new size of the content view. */
export type ContentSizeChangeEvent = NativeSyntheticEvent<Size>;

/** One laid-out line, from `(textLayout)`. */
export interface TextLayoutLine extends Rect {
  readonly ascender: number;
  readonly capHeight: number;
  readonly descender: number;
  readonly text: string;
  readonly xHeight: number;
}
export interface TextLayoutPayload {
  readonly lines: readonly TextLayoutLine[];
}
export type TextLayoutEvent = NativeSyntheticEvent<TextLayoutPayload>;

/** `(change)` on a text input, and the value the model is set from. */
export interface TextInputChangePayload {
  readonly text: string;
  readonly eventCount: number;
  readonly target: number;
}
export type TextInputChangeEvent = NativeSyntheticEvent<TextInputChangePayload>;

/** `(submitEditing)` and `(endEditing)`. */
export type TextInputEditingEvent = NativeSyntheticEvent<TextInputChangePayload>;

/** `(focus)` and `(blur)` on a text input. */
export interface TextInputFocusPayload {
  readonly target: number;
  readonly eventCount?: number;
  readonly text?: string;
}
export type TextInputFocusEvent = NativeSyntheticEvent<TextInputFocusPayload>;

/** `(selectionChange)`. */
export interface SelectionChangePayload {
  readonly selection: { readonly start: number; readonly end: number };
  readonly target: number;
}
export type SelectionChangeEvent = NativeSyntheticEvent<SelectionChangePayload>;

/** `(keyPress)`: `key` is the character, or `Backspace`, `Enter`, `Tab` and so on. */
export interface KeyPressPayload {
  readonly key: string;
  readonly target?: number;
  readonly eventCount?: number;
}
export type KeyPressEvent = NativeSyntheticEvent<KeyPressPayload>;

/** `(contentSizeChange)` on a multiline text input. */
export interface TextInputContentSizePayload {
  readonly contentSize: Size;
  readonly target: number;
}
export type TextInputContentSizeEvent = NativeSyntheticEvent<TextInputContentSizePayload>;

/** `(scroll)` on a multiline text input. */
export interface TextInputScrollPayload {
  readonly contentOffset: Point;
}
export type TextInputScrollEvent = NativeSyntheticEvent<TextInputScrollPayload>;

/** `(change)` on a switch. */
export interface SwitchChangePayload {
  readonly value: boolean;
  readonly target: number;
}
export type SwitchChangeEvent = NativeSyntheticEvent<SwitchChangePayload>;

/** `(load)` on an image: what was decoded. */
export interface ImageLoadPayload {
  readonly source: { readonly uri: string; readonly width: number; readonly height: number };
}
export type ImageLoadEvent = NativeSyntheticEvent<ImageLoadPayload>;

/** `(error)` on an image. */
export interface ImageErrorPayload {
  readonly error: string;
}
export type ImageErrorEvent = NativeSyntheticEvent<ImageErrorPayload>;

/** `(progress)` on an image, iOS only. */
export interface ImageProgressPayload {
  readonly loaded: number;
  readonly total: number;
}
export type ImageProgressEvent = NativeSyntheticEvent<ImageProgressPayload>;

/** `(orientationChange)` on a modal, iOS only. */
export interface OrientationChangePayload {
  readonly orientation: 'portrait' | 'landscape';
}
export type OrientationChangeEvent = NativeSyntheticEvent<OrientationChangePayload>;

/** `(accessibilityAction)`: which of the view's declared actions the assistive technology fired. */
export interface AccessibilityActionPayload {
  readonly actionName: string;
}
export type AccessibilityActionEvent = NativeSyntheticEvent<AccessibilityActionPayload>;

/*
 * The events above, by name, where Angular's template type-checker looks for an element event's
 * type. It types `$event` in `(layout)="..."` from `HTMLElementEventMap`, so without these every
 * native event reads as a DOM `Event` and `$event.nativeEvent` fails to type-check. There is no
 * DOM here to be wrong about. Names the DOM already has - `scroll`, `change`, `focus`, `blur`,
 * `load`, `error`, `progress` - keep its `Event`: an interface cannot give them a second type.
 */
declare global {
  interface HTMLElementEventMap {
    layout: LayoutEvent;
    touchStart: TouchEvent;
    touchMove: TouchEvent;
    touchEnd: TouchEvent;
    touchCancel: TouchEvent;
    scrollBeginDrag: ScrollEvent;
    scrollEndDrag: ScrollEvent;
    momentumScrollBegin: ScrollEvent;
    momentumScrollEnd: ScrollEvent;
    /** A scroll view's content, or a multiline text input's. */
    contentSizeChange: ContentSizeChangeEvent | TextInputContentSizeEvent;
    textLayout: TextLayoutEvent;
    submitEditing: TextInputEditingEvent;
    endEditing: TextInputEditingEvent;
    selectionChange: SelectionChangeEvent;
    keyPress: KeyPressEvent;
    orientationChange: OrientationChangeEvent;
    accessibilityAction: AccessibilityActionEvent;
  }
}
