import { Service, computed, effect, inject } from '@angular/core';
import { KeepAwake } from '@ng-native/expo/keep-awake';
import { Catalogue, type Track } from '../catalogue/catalogue.ts';
import { Queue } from './queue.ts';
import { TRACK_PLAYER } from './track-player.ts';

/**
 * Plays whatever the queue is on: one player, pointed at a new track with `replace()` rather than
 * recreated each time, so the player - and the OS's now-playing session - survives from one track
 * to the next.
 *
 * The queue is a separate service on purpose: it knows track order, this knows how to make a
 * track audible, and neither has to fake the other to be tested.
 */
@Service()
export class Playback {
  private readonly queue = inject(Queue);
  private readonly catalogue = inject(Catalogue);
  private readonly keepAwake = inject(KeepAwake);
  private releaseKeepAwake: (() => void) | null = null;

  // Created once and pointed at new sources from then on - see `own()` in player.ts for why one
  // player, not one per track, is what `release()` needs.
  private readonly player = inject(TRACK_PLAYER)(this.catalogue.tracks[0]!.source);

  readonly current = this.queue.current;
  readonly shuffled = this.queue.shuffled;
  readonly repeat = this.queue.repeat;
  readonly hasNext = this.queue.hasNext;
  readonly hasPrevious = this.queue.hasPrevious;
  readonly state = this.player.state;
  readonly playing = computed(() => this.state().playing);
  readonly progress = computed(() => {
    const { currentTime, duration } = this.state();
    return duration > 0 ? currentTime / duration : 0;
  });

  constructor() {
    // `loop` is the native player's own repeat-one: letting it replay the track natively is
    // simpler, and smoother, than restarting it by hand from an `ended` event.
    effect(() => {
      this.player.setLoop(this.queue.repeat() === 'one');
    });
    // A track that ends on its own (as opposed to a manual `next()`) advances the queue exactly
    // as pressing next would - unless `loop` is already handling it.
    effect(() => {
      if (this.state().ended && this.queue.repeat() !== 'one' && this.queue.hasNext()) {
        this.queue.next();
        this.playCurrent();
      }
    });
  }

  /** Starts the given tracks playing, at `startId` if it names one of them. */
  playQueue(tracks: readonly Track[], startId?: string): void {
    this.queue.load(tracks, startId);
    this.playCurrent();
  }

  toggle(): void {
    if (!this.queue.current()) return;
    this.state().playing ? this.player.pause() : this.player.play();
  }

  next(): void {
    if (!this.queue.hasNext()) return;
    this.queue.next();
    this.playCurrent();
  }

  previous(): void {
    // Within the first couple of seconds, "previous" restarts the track, the way most players do.
    if (this.state().currentTime > 2 || !this.queue.hasPrevious()) {
      this.player.seekTo(0);
      return;
    }
    this.queue.previous();
    this.playCurrent();
  }

  seekTo(seconds: number): void {
    this.player.seekTo(seconds);
  }

  toggleShuffle(): void {
    this.queue.toggleShuffle();
  }

  cycleRepeat(): void {
    this.queue.cycleRepeat();
  }

  private playCurrent(): void {
    const track = this.queue.current();
    if (!track) return;
    this.player.replace(track.source);
    this.player.play();
    this.holdAwakeWhilePlaying();
  }

  /** The screen should not sleep while music plays, and should go back to normal once it stops. */
  private holdAwakeWhilePlaying(): void {
    this.releaseKeepAwake?.();
    this.releaseKeepAwake = this.keepAwake.hold('music-playback');
  }
}
