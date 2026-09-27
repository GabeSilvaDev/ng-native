import { Component, inject } from '@angular/core';
import { Text } from '@ng-native/components';
import { render, screen } from '@ng-native/testing';
import { expect, test } from 'vitest';
import { LocationSourceSetting } from '../settings/location-source-setting.ts';
import type { LocationFix, LocationSource } from './location-source.ts';
import { SimulatedLocationSource } from './simulated-location-source.ts';
import { Tracking } from './tracking.ts';

/** A source under the test's own control: fixes are sent by calling `emit`, not on a timer. */
class FakeLocationSource implements LocationSource {
  private onFix: ((fix: LocationFix) => void) | null = null;
  stopped = false;

  start(onFix: (fix: LocationFix) => void): () => void {
    this.onFix = onFix;
    return () => {
      this.stopped = true;
      this.onFix = null;
    };
  }

  emit(fix: LocationFix): void {
    this.onFix?.(fix);
  }
}

@Component({
  selector: 'x-tracking-harness',
  imports: [Text],
  template: `
    <text testID="status">{{ tracking.status() }}</text>
    <text testID="distance">{{ tracking.distanceMeters() }}</text>
    <text testID="elapsed">{{ tracking.elapsedSeconds() }}</text>
  `,
})
class TrackingHarness {
  protected readonly tracking = inject(Tracking);
}

// A point on the equator, `metersEast` metres further along it than the last - close enough to
// exact at these distances that the arithmetic below can use it directly.
function pointAt(metersEast: number, timestamp: number): LocationFix {
  const METERS_PER_DEGREE = 111_194.93;
  return { latitude: 0, longitude: metersEast / METERS_PER_DEGREE, altitude: null, timestamp };
}

async function startHarness() {
  const source = new FakeLocationSource();
  const { componentRef } = await render(TrackingHarness, {
    providers: [
      { provide: SimulatedLocationSource, useValue: source },
      { provide: LocationSourceSetting, useValue: { simulate: () => true } },
    ],
  });
  const tracking = componentRef.injector.get(Tracking);
  tracking.start();
  return { source, tracking };
}

test('recording accumulates distance and elapsed time from the fixes received', async () => {
  const { source, tracking } = await startHarness();

  source.emit(pointAt(0, 0));
  source.emit(pointAt(100, 10_000));
  source.emit(pointAt(250, 25_000));

  expect(tracking.distanceMeters()).toBeCloseTo(250, 0);
  expect(tracking.elapsedSeconds()).toBeCloseTo(25, 0);
  expect(await screen.findByText('recording')).toBeTruthy();
});

test('pausing stops distance and time from accumulating, and resuming picks back up', async () => {
  const { source, tracking } = await startHarness();

  source.emit(pointAt(0, 0));
  source.emit(pointAt(100, 10_000));
  tracking.pause();
  source.emit(pointAt(500, 400_000)); // Ignored: recorded while paused.
  expect(tracking.distanceMeters()).toBeCloseTo(100, 0);
  expect(tracking.elapsedSeconds()).toBeCloseTo(10, 0);

  tracking.resume();
  source.emit(pointAt(150, 415_000));

  // The 50m from 100 to 150 is counted; the gap while paused is not, in either distance or time.
  expect(tracking.distanceMeters()).toBeCloseTo(150, 0);
  expect(tracking.elapsedSeconds()).toBeCloseTo(10, 0);
});

test('finishing saves the run and returns tracking to idle', async () => {
  const { source, tracking } = await startHarness();

  source.emit(pointAt(0, 0));
  source.emit(pointAt(300, 60_000));

  const run = tracking.finish();

  expect(run).toBeTruthy();
  expect(run!.distanceMeters).toBeCloseTo(300, 0);
  expect(source.stopped).toBe(true);
  expect(tracking.status()).toBe('idle');
  expect(tracking.route()).toEqual([]);
});

test('discarding a run stops the source without saving anything', async () => {
  const { source, tracking } = await startHarness();

  source.emit(pointAt(0, 0));
  source.emit(pointAt(300, 60_000));

  tracking.discard();

  expect(source.stopped).toBe(true);
  expect(tracking.status()).toBe('idle');
});

test('starting twice does nothing the second time', async () => {
  const { source, tracking } = await startHarness();
  source.emit(pointAt(0, 0));

  tracking.start();
  source.emit(pointAt(300, 60_000));

  // A second `start()` would have reset the route; it did not.
  expect(tracking.distanceMeters()).toBeCloseTo(300, 0);
});
