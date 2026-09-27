import { Service, computed, inject, signal } from '@angular/core';
import { Runs, type Run } from '../data/runs.ts';
import { LocationSourceSetting } from '../settings/location-source-setting.ts';
import { paceSecondsPerKm, totalDistanceMeters, type TimedPoint } from './geo.ts';
import type { LocationFix } from './location-source.ts';
import { RealLocationSource } from './real-location-source.ts';
import { SimulatedLocationSource } from './simulated-location-source.ts';

export type TrackingStatus = 'idle' | 'recording' | 'paused';

/**
 * A run in progress: the route recorded so far, and the distance, elapsed time and pace worked
 * out from it. Reads fixes from whichever `LocationSource` settings picks.
 *
 * Time only moves while `status` is `'recording'`: a fix that arrives while paused is dropped
 * rather than counted, so `elapsedSeconds` excludes a pause without needing a wall clock or a
 * separate timer - it is entirely a function of the fixes actually recorded.
 */
@Service()
export class Tracking {
  private readonly real = inject(RealLocationSource);
  private readonly simulated = inject(SimulatedLocationSource);
  private readonly locationSetting = inject(LocationSourceSetting);
  private readonly runsService = inject(Runs);

  readonly status = signal<TrackingStatus>('idle');
  readonly route = signal<readonly TimedPoint[]>([]);

  private readonly movingMs = signal(0);
  private lastFixAt: number | null = null;
  private stopSource: () => void = () => {};

  readonly distanceMeters = computed(() => totalDistanceMeters(this.route()));
  readonly elapsedSeconds = computed(() => this.movingMs() / 1_000);
  readonly paceSecondsPerKm = computed(() =>
    paceSecondsPerKm(this.distanceMeters(), this.elapsedSeconds()),
  );

  start(): void {
    if (this.status() !== 'idle') return;
    this.route.set([]);
    this.movingMs.set(0);
    this.lastFixAt = null;
    this.status.set('recording');

    const source = this.locationSetting.simulate() ? this.simulated : this.real;
    this.stopSource = source.start((fix) => this.recordFix(fix));
  }

  pause(): void {
    if (this.status() !== 'recording') return;
    this.status.set('paused');
    // Cleared so the fix after resume does not count the pause itself as moving time.
    this.lastFixAt = null;
  }

  resume(): void {
    if (this.status() !== 'paused') return;
    this.status.set('recording');
  }

  /** Ends the run and saves it, if anything worth keeping was recorded. */
  finish(): Run | null {
    if (this.status() === 'idle') return null;
    const route = this.route();
    const durationSeconds = this.elapsedSeconds();
    this.reset();
    return route.length >= 2 ? this.runsService.record(route, durationSeconds) : null;
  }

  /** Ends the run without saving it. */
  discard(): void {
    this.reset();
  }

  private recordFix(fix: LocationFix): void {
    if (this.status() !== 'recording') return;
    this.route.update((route) => [
      ...route,
      { latitude: fix.latitude, longitude: fix.longitude, timestamp: fix.timestamp },
    ]);
    if (this.lastFixAt !== null) {
      this.movingMs.update((ms) => ms + (fix.timestamp - this.lastFixAt!));
    }
    this.lastFixAt = fix.timestamp;
  }

  private reset(): void {
    this.stopSource();
    this.stopSource = () => {};
    this.status.set('idle');
    this.route.set([]);
    this.movingMs.set(0);
    this.lastFixAt = null;
  }
}
