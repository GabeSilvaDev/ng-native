/**
 * Media players, bound to `expo-video` and `expo-audio`.
 *
 * ```ts
 * protected readonly player = videoPlayer(this.source, { timeUpdate: 0.5 });
 *
 * // <expo-video [player]="player.native" />
 * // {{ player.state().currentTime }}
 * ```
 *
 * `useVideoPlayer` and `useAudioPlayer` are the documented way in, and the player they hand back
 * is not the React part - `createVideoPlayer` gives the same object. What the hooks add is the
 * two things a component actually needs and cannot get otherwise: the player is *released* when
 * the component goes, and its changing state is *readable*, because the player's own properties
 * are plain mutable fields that no template can watch.
 *
 * The player itself is passed straight through: it is a shared object with `play()`, `seekBy()`
 * and the rest already on it, and wrapping those would be a second place for each to be wrong.
 */
import { DestroyRef, inject, signal, type Signal } from '@angular/core';
import { optional } from './native.ts';

/** The player's own status, which is the same word in both modules. */
export type PlayerStatus = 'idle' | 'loading' | 'readyToPlay' | 'error';

/** The slice of a player this reads. Both modules' players satisfy it structurally. */
export interface NativePlayer {
  addListener(event: string, listener: (payload: never) => void): { remove(): void };
  release?(): void;
  /** Seconds between `timeUpdate` events. Zero, its default, means the event never fires. `expo-video` only. */
  timeUpdateEventInterval?: number;
  /** Read directly rather than from an event: `expo-audio`'s status carries no volume field. */
  readonly volume?: number;
}

/**
 * `expo-audio`'s one status event, `playbackStatusUpdate`. Unlike `expo-video`, which splits its
 * state across several named events, `AudioPlayer` reports everything - including errors - on a
 * single event, at the interval `updateInterval` was created with.
 */
export interface NativeAudioStatus {
  readonly playing: boolean;
  readonly mute: boolean;
  readonly duration: number;
  readonly currentTime: number;
  readonly isLoaded: boolean;
  readonly didJustFinish: boolean;
  readonly error: string | null;
}

export interface PlayerState {
  readonly playing: boolean;
  readonly status: PlayerStatus;
  /** Seconds. Only moves while `timeUpdateEventInterval` is non-zero. */
  readonly currentTime: number;
  readonly duration: number;
  readonly muted: boolean;
  readonly volume: number;
  /** Set once playback has run to the end, and cleared when it starts again. */
  readonly ended: boolean;
}

const INITIAL: PlayerState = {
  playing: false,
  status: 'idle',
  currentTime: 0,
  duration: 0,
  muted: false,
  volume: 1,
  ended: false,
};

/**
 * Watch an `expo-video` player, and stop watching when the caller is done with it.
 *
 * `timeUpdate` defaults to off, so `currentTime` would never move. A caller that wants a progress
 * bar asks for one by passing an interval, and one that does not pays nothing: the event is the
 * most frequent thing the player emits.
 *
 * `expo-audio`'s player reports its state differently - one event, not several - so it is watched
 * by `watchAudioPlayer` below rather than this function.
 */
export function watchPlayer(
  player: NativePlayer | null,
  options: { timeUpdate?: number } = {},
): { state: Signal<PlayerState>; stop: () => void } {
  const state = signal(INITIAL);
  if (!player) return { state: state.asReadonly(), stop: () => {} };

  const patch = (change: Partial<PlayerState>) => state.update((last) => ({ ...last, ...change }));
  const subscriptions = [
    listen(player, 'statusChange', ({ status }: { status: PlayerStatus }) => patch({ status })),
    listen(player, 'playingChange', ({ isPlaying }: { isPlaying: boolean }) =>
      patch({ playing: isPlaying, ...(isPlaying ? { ended: false } : {}) }),
    ),
    listen(player, 'mutedChange', ({ muted }: { muted: boolean }) => patch({ muted })),
    listen(player, 'volumeChange', ({ volume }: { volume: number }) => patch({ volume })),
    listen(player, 'playToEnd', () => patch({ ended: true, playing: false })),
    listen(player, 'timeUpdate', ({ currentTime }: { currentTime: number }) =>
      patch({ currentTime }),
    ),
    listen(player, 'sourceChange', () => patch({ ...INITIAL, status: 'loading' })),
    // The only event that says how long the video is: nothing else carries a duration.
    listen(player, 'sourceLoad', ({ duration }: { duration: number }) => patch({ duration })),
  ];

  if (options.timeUpdate !== undefined) player.timeUpdateEventInterval = options.timeUpdate;

  return {
    state: state.asReadonly(),
    stop: () => {
      for (const subscription of subscriptions) subscription();
      // Releasing is the half a hook does that nothing else will: a player left alive holds its
      // decoder, its audio session and, on iOS, the now-playing controls.
      player.release?.();
    },
  };
}

function listen<T>(player: NativePlayer, event: string, handler: (payload: T) => void): () => void {
  const subscription = player.addListener(event, handler as (payload: never) => void);
  return () => subscription.remove();
}

/**
 * Watch an `expo-audio` player, and stop watching when the caller is done with it.
 *
 * `AudioPlayer` reports its whole state on `playbackStatusUpdate`, at the interval it was created
 * with, rather than splitting it across the several events `expo-video` uses - so unlike
 * `watchPlayer`, there is one listener, not several, and nothing to reset on a source change: the
 * next status update carries the new source's own state.
 */
function watchAudioPlayer(player: NativePlayer | null): {
  state: Signal<PlayerState>;
  stop: () => void;
} {
  const state = signal(INITIAL);
  if (!player) return { state: state.asReadonly(), stop: () => {} };

  const subscription = listen(player, 'playbackStatusUpdate', (status: NativeAudioStatus) =>
    state.set({
      playing: status.playing,
      status: status.error !== null ? 'error' : status.isLoaded ? 'readyToPlay' : 'loading',
      currentTime: status.currentTime,
      duration: status.duration,
      muted: status.mute,
      // Not on the status event; the player's own property is the current value.
      volume: player.volume ?? INITIAL.volume,
      ended: status.didJustFinish,
    }),
  );

  return {
    state: state.asReadonly(),
    stop: () => {
      subscription();
      // Releasing is the half a hook does that nothing else will: a player left alive holds its
      // decoder, its audio session and, on iOS, the now-playing controls.
      player.release?.();
    },
  };
}

export interface Player<T> {
  /** The module's own player, for `play()`, `seekBy()`, and to hand to its view. */
  readonly native: T;
  readonly state: Signal<PlayerState>;
}

/** A video player owned by the current component, released when it is destroyed. */
export function videoPlayer(
  source: import('expo-video').VideoSource,
  options: { timeUpdate?: number } = {},
): Player<import('expo-video').VideoPlayer> {
  const expo = optional(() => require('expo-video') as typeof import('expo-video'));
  if (!expo) throw new Error('[angular-native] expo-video is not installed');
  const native = expo.createVideoPlayer(source);
  return own(native, () => watchPlayer(native, options));
}

/**
 * An audio player owned by the current component, released when it is destroyed.
 *
 * `expo-audio` has no `timeUpdateEventInterval` property to set after the fact - the interval is
 * an option to `createAudioPlayer` itself, in milliseconds rather than `videoPlayer`'s seconds.
 */
export function audioPlayer(
  source: import('expo-audio').AudioSource,
  options: { timeUpdate?: number } = {},
): Player<import('expo-audio').AudioPlayer> {
  const expo = optional(() => require('expo-audio') as typeof import('expo-audio'));
  if (!expo) throw new Error('[angular-native] expo-audio is not installed');
  const updateInterval = options.timeUpdate === undefined ? undefined : options.timeUpdate * 1000;
  const native = expo.createAudioPlayer(source, { updateInterval });
  return own(native, () => watchAudioPlayer(native));
}

/**
 * Tie a player's life to the component that made it.
 *
 * Called in an injection context, which is the same constraint the hooks have and for the same
 * reason: something has to know when the thing goes away.
 */
function own<T extends NativePlayer>(
  native: T,
  watch: () => { state: Signal<PlayerState>; stop: () => void },
): Player<T> {
  const { state, stop } = watch();
  inject(DestroyRef).onDestroy(stop);
  return { native, state };
}
