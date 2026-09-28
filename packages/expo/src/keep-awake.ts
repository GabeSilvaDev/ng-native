/**
 * `KeepAwake`, bound to `expo-keep-awake`.
 *
 * ```ts
 * inject(DestroyRef).onDestroy(inject(KeepAwake).hold('recording'));
 * ```
 *
 * Never a bare activate: a screen that holds the display on and never releases it is a phone that
 * never sleeps, which the user experiences as a battery fault and never attributes to the app.
 *
 * Tags are how two screens can each hold it without either releasing the other's.
 */
import { InjectionToken, Service, computed, inject, signal, type Signal } from '@angular/core';
import { expoModule } from './native.ts';

export interface NativeKeepAwake {
  activate(tag: string): Promise<void>;
  deactivate(tag: string): Promise<void>;
}

const DEFAULT_TAG = 'angular-native';

@Service()
export class KeepAwake {
  /** Overridden in a test to record a hold without keeping a screen on. */
  static readonly SOURCE = new InjectionToken<NativeKeepAwake | null>(
    'angular-native.keepAwakeSource',
    {
      factory: () => {
        const expo = expoModule(
          'expo-keep-awake',
          () => require('expo-keep-awake') as typeof import('expo-keep-awake'),
        );
        if (!expo) return null;
        return {
          activate: (tag) => expo.activateKeepAwakeAsync(tag),
          deactivate: (tag) => expo.deactivateKeepAwake(tag),
        };
      },
    },
  );

  private readonly native = inject(KeepAwake.SOURCE);
  private readonly held = signal<ReadonlySet<string>>(new Set());

  /** The tags currently holding the screen on, so a debug screen can say which. */
  readonly holders: Signal<ReadonlySet<string>> = this.held.asReadonly();

  /** Whether anything currently holds the screen on. */
  readonly active: Signal<boolean> = computed(() => this.held().size > 0);

  /**
   * Hold the screen on. Returns the function that releases it, ready for `DestroyRef.onDestroy`.
   *
   * Never a bare `activate()`, because the release is the half that gets forgotten and the half
   * that matters.
   */
  hold(tag = DEFAULT_TAG): () => void {
    // Counted per tag: two screens of one kind hold the same one, and the native module keeps a
    // set of tags, so the first to release would otherwise let go for both.
    const count = this.counts.get(tag) ?? 0;
    this.counts.set(tag, count + 1);
    if (count === 0) {
      this.held.update((tags) => new Set(tags).add(tag));
      void this.native?.activate(tag).catch(() => {});
    }

    let released = false;
    return () => {
      if (released) return;
      released = true;
      const left = (this.counts.get(tag) ?? 1) - 1;
      if (left > 0) {
        this.counts.set(tag, left);
        return;
      }
      this.counts.delete(tag);
      this.held.update((tags) => {
        const next = new Set(tags);
        next.delete(tag);
        return next;
      });
      void this.native?.deactivate(tag).catch(() => {});
    };
  }

  /** How many holds each tag has that are not yet released. */
  private readonly counts = new Map<string, number>();
}
