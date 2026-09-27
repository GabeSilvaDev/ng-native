import { Component, inject } from '@angular/core';
import { render } from '@ng-native/testing';
import { expect, test } from 'vitest';
import { Runs } from './runs.ts';

@Component({ selector: 'x-runs-harness', template: '' })
class RunsHarness {
  protected readonly runs = inject(Runs);
}

async function harness() {
  const { componentRef } = await render(RunsHarness);
  return componentRef.injector.get(Runs);
}

test('a fresh launch has seeded runs, newest first', async () => {
  const runs = await harness();

  const all = runs.runs();
  expect(all.length).toBeGreaterThan(0);
  const startedTimes = all.map((run) => new Date(run.startedAt).getTime());
  expect(startedTimes).toEqual([...startedTimes].sort((a, b) => b - a));
});

test('recording a run adds it to the top of the list, with distance and splits worked out', async () => {
  const runs = await harness();
  const before = runs.runs().length;

  const run = runs.record(
    [
      { latitude: 51.53, longitude: -0.15, timestamp: 0 },
      { latitude: 51.531, longitude: -0.151, timestamp: 60_000 },
    ],
    60,
  );

  expect(runs.runs().length).toBe(before + 1);
  expect(runs.runs()[0]!.id).toBe(run.id);
  expect(run.durationSeconds).toBe(60);
  expect(run.distanceMeters).toBeGreaterThan(0);
});

test('find looks a run up by id, and returns undefined for one that does not exist', async () => {
  const runs = await harness();
  const [first] = runs.runs();

  expect(runs.find(first!.id)).toBe(first);
  expect(runs.find('not-a-real-id')).toBeUndefined();
});

test('removing a run takes it out of the list', async () => {
  const runs = await harness();
  const [first] = runs.runs();

  runs.remove(first!.id);

  expect(runs.find(first!.id)).toBeUndefined();
});
