import { expect, test } from 'vitest';
import type { Run } from '../data/runs.ts';
import { escapeXml, gpxFileName, toGpx } from './gpx.ts';

const run: Run = {
  id: 'r1',
  startedAt: '2026-09-20T07:00:00.000Z',
  durationSeconds: 120,
  distanceMeters: 500,
  route: [
    { latitude: 51.5313, longitude: -0.1568, timestamp: Date.parse('2026-09-20T07:00:00.000Z') },
    { latitude: 51.5327, longitude: -0.1591, timestamp: Date.parse('2026-09-20T07:01:00.000Z') },
    { latitude: 51.5346, longitude: -0.1608, timestamp: Date.parse('2026-09-20T07:02:00.000Z') },
  ],
  splits: [],
};

test('exports a valid GPX 1.1 document', () => {
  const gpx = toGpx(run);

  expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  expect(gpx).toContain('<gpx version="1.1"');
  expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
});

test('writes one trkpt per recorded fix, with its coordinates and time', () => {
  const gpx = toGpx(run);

  expect(gpx).toContain('<trkpt lat="51.5313" lon="-0.1568">');
  expect(gpx).toContain('<trkpt lat="51.5346" lon="-0.1608">');
  expect(gpx).toContain('<time>2026-09-20T07:01:00.000Z</time>');
  expect((gpx.match(/<trkpt/g) ?? []).length).toBe(3);
});

test('names the track after the run', () => {
  const gpx = toGpx(run);
  expect(gpx).toContain('<name>Run - ');
});

test('escapes characters XML cannot carry literally', () => {
  expect(escapeXml('Tom & Jerry <run> "fast"')).toBe(
    'Tom &amp; Jerry &lt;run&gt; &quot;fast&quot;',
  );
});

test('the file name is stable and identifies the run', () => {
  expect(gpxFileName(run)).toBe('run-2026-09-20-r1.gpx');
});
