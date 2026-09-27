/**
 * `ObservableState`: the one `@expo/ui` prop that is not a value.
 *
 * `TextFieldView` and `SecureFieldView` declare `text` as an `ObservableState` rather than a
 * `String`, and what travels over the prop is the shared object's id, a number. Binding the string
 * itself is the obvious thing to write and it fails as
 * `FieldInvalidTypeException`, logged rather than thrown, so the field renders and simply ignores
 * everything the app sets. Both fields also manage their own text when the prop is absent, which
 * is why the mistake looks like it works: typing behaves, and only setting the value from Angular
 * does nothing.
 *
 * The state lives on the native side and both sides hold a reference, so it survives the commit
 * that a signal would not: writing to it moves the caret in a field that is already on screen,
 * where a re-render would not. That is the whole reason the prop is shaped this way.
 *
 * ```ts
 * protected readonly name = nativeState('');
 * ```
 * ```html
 * <ui-text-field [text]="name?.id" (textChange)="typed.set($event.nativeEvent.value)" />
 * ```
 *
 * `null` off a device, where there is no native module to hold the state. Bind `name?.id` and the
 * prop is simply absent, which is the field's own unmanaged behaviour rather than a crash.
 */
import { optional } from './native.ts';

/** What `useNativeState` builds by hand, since native exposes getters rather than a property. */
interface RawState {
  readonly __expo_shared_object_id__?: number;
  getValue(): unknown;
  setValue(value: { value: unknown }): void;
  release(): void;
}

/** A value held on the native side, addressed by id. */
export interface NativeState<T> {
  /** What the view prop takes. `undefined` if the object has already been released. */
  readonly id: number | undefined;
  /**
   * The current value.
   *
   * A write from JavaScript is scheduled onto the UI thread, so it is not readable back until
   * that has run. `@expo/ui` says the same of its own accessors.
   */
  get(): T;
  set(value: T): void;
  /**
   * Detach from the native object. Nothing else may use the state afterwards.
   *
   * Worth calling from `DestroyRef` for a field inside a list that comes and goes; a state that
   * lives as long as the app does not need it.
   */
  release(): void;
}

/** Somewhere to hold a text field's text. See the file comment. */
export function nativeState<T>(initial: T): NativeState<T> | null {
  const raw = optional(() => {
    const { requireNativeModule } = require('expo') as typeof import('expo');
    const module = requireNativeModule('ExpoUI') as {
      ObservableState: new (init: { value: unknown }) => RawState;
    };
    return new module.ObservableState({ value: initial });
  });
  if (!raw) return null;

  return {
    id: raw.__expo_shared_object_id__,
    get: () => raw.getValue() as T,
    set: (value: T) => raw.setValue({ value }),
    release: () => raw.release(),
  };
}
