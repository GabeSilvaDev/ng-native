import { Service, computed, signal } from '@angular/core';
import type { Track } from '../catalogue/catalogue.ts';

export type RepeatMode = 'off' | 'all' | 'one';

/**
 * Track order and position: what "next" and "previous" mean, kept apart from playback itself.
 * `Playback` (playback.ts) points an audio player at whatever the queue is currently on; this
 * service knows nothing about audio, which is what makes it a synchronous, no-mocking unit test.
 */
@Service()
export class Queue {
  private readonly tracks = signal<readonly Track[]>([]);
  /** Indices into `tracks`, in play order. Shuffling reorders this, not `tracks` itself. */
  private readonly order = signal<readonly number[]>([]);
  private readonly position = signal(0);

  readonly shuffled = signal(false);
  readonly repeat = signal<RepeatMode>('off');

  readonly current = computed<Track | undefined>(() => {
    const order = this.order();
    return order.length ? this.tracks()[order[this.position()]!] : undefined;
  });
  readonly upcoming = computed<readonly Track[]>(() => {
    const order = this.order();
    const tracks = this.tracks();
    return order.slice(this.position() + 1).map((i) => tracks[i]!);
  });
  readonly hasPrevious = computed(() => this.position() > 0);
  readonly hasNext = computed(
    () => this.repeat() !== 'off' || this.position() < this.order().length - 1,
  );

  /** Replace the queue with a list of tracks, starting at one of them (or the first). */
  load(tracks: readonly Track[], startId?: string): void {
    this.tracks.set(tracks);
    const start = Math.max(0, startId ? tracks.findIndex((t) => t.id === startId) : 0);
    const shuffled = this.shuffled();
    // Shuffling puts the start track first, so position 0 is already correct there; in order,
    // position has to be the start track's own index instead.
    this.order.set(shuffled ? shuffledOrder(tracks.length, start) : tracks.map((_, i) => i));
    this.position.set(shuffled ? 0 : start);
  }

  /** Moves to the next track. Does nothing at the end of an un-repeated queue. */
  next(): void {
    const order = this.order();
    if (this.position() < order.length - 1) this.position.update((p) => p + 1);
    else if (this.repeat() === 'all' && order.length) this.position.set(0);
  }

  /** Moves to the previous track, or wraps to the last one when repeating the whole queue. */
  previous(): void {
    if (this.position() > 0) this.position.update((p) => p - 1);
    else if (this.repeat() === 'all' && this.order().length)
      this.position.set(this.order().length - 1);
  }

  toggleShuffle(): void {
    const shuffled = !this.shuffled();
    this.shuffled.set(shuffled);
    const tracks = this.tracks();
    const currentIndex = tracks.findIndex((t) => t.id === this.current()?.id);
    this.order.set(shuffled ? shuffledOrder(tracks.length, currentIndex) : tracks.map((_, i) => i));
    this.position.set(0);
  }

  cycleRepeat(): void {
    const modes: readonly RepeatMode[] = ['off', 'all', 'one'];
    this.repeat.set(modes[(modes.indexOf(this.repeat()) + 1) % modes.length]!);
  }
}

/** A Fisher-Yates shuffle that keeps `keepFirst` at the front, so the track playing stays put. */
function shuffledOrder(length: number, keepFirst: number): number[] {
  const rest = Array.from({ length }, (_, i) => i).filter((i) => i !== keepFirst);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return keepFirst >= 0 ? [keepFirst, ...rest] : rest;
}
