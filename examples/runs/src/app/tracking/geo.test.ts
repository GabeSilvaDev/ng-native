import { expect, test } from 'vitest';
import {
  convertDistance,
  convertPace,
  formatDistance,
  formatDuration,
  formatPace,
  haversineMeters,
  paceSecondsPerKm,
  splits,
  totalDistanceMeters,
  type TimedPoint,
} from './geo.ts';

// The earth radius `geo.ts` uses. Kept here too so these expectations do not depend on the
// implementation being tested: on the equator, where the two points share a latitude, the
// haversine formula reduces to `radius * angleInRadians` exactly.
const EARTH_RADIUS_METERS = 6_371_000;
const equatorMetersPerDegree = (degrees: number) =>
  (EARTH_RADIUS_METERS * (degrees * Math.PI)) / 180;

test('haversine distance between two points on the equator matches the closed-form angle', () => {
  const a = { latitude: 0, longitude: 0 };
  const b = { latitude: 0, longitude: 1 };

  expect(haversineMeters(a, b)).toBeCloseTo(equatorMetersPerDegree(1), 0);
});

test('haversine distance between the same point is zero', () => {
  const point = { latitude: 51.5308, longitude: -0.1238 };
  expect(haversineMeters(point, point)).toBe(0);
});

test('total distance sums each leg of the route', () => {
  const route = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 0.005 },
    { latitude: 0, longitude: 0.01 },
  ];

  expect(totalDistanceMeters(route)).toBeCloseTo(equatorMetersPerDegree(0.01), 0);
});

test('a route with fewer than two points has no distance', () => {
  expect(totalDistanceMeters([])).toBe(0);
  expect(totalDistanceMeters([{ latitude: 0, longitude: 0 }])).toBe(0);
});

test('pace is time per kilometre, and zero without any distance', () => {
  expect(paceSecondsPerKm(1_000, 300)).toBe(300);
  expect(paceSecondsPerKm(500, 300)).toBe(600);
  expect(paceSecondsPerKm(0, 300)).toBe(0);
});

test('distance converts to miles', () => {
  expect(convertDistance(1_609.34, 'mi')).toBeCloseTo(1, 5);
  expect(convertDistance(1_000, 'km')).toBe(1);
});

test('pace converts to minutes per mile', () => {
  // 5:00/km is slower per mile, because a mile is longer than a kilometre.
  expect(convertPace(300, 'mi')).toBeCloseTo(482.8, 0);
  expect(convertPace(300, 'km')).toBe(300);
});

test('duration formats as mm:ss, or h:mm:ss past an hour', () => {
  expect(formatDuration(65)).toBe('1:05');
  expect(formatDuration(5)).toBe('0:05');
  expect(formatDuration(3_725)).toBe('1:02:05');
});

test('pace formats as m:ss, or a placeholder with nothing to show yet', () => {
  expect(formatPace(303)).toBe('5:03');
  expect(formatPace(0)).toBe('--:--');
  expect(formatPace(Number.NaN)).toBe('--:--');
});

test('distance formats to two decimal places', () => {
  expect(formatDistance(3.1)).toBe('3.10');
  expect(formatDistance(10)).toBe('10.00');
});

test('splits are empty for a route with fewer than two points', () => {
  expect(splits([])).toEqual([]);
  expect(splits([{ latitude: 0, longitude: 0, timestamp: 0 }])).toEqual([]);
});

test('a split is recorded each time the route crosses a kilometre, interpolated between fixes', () => {
  // Three points on the equator, each 0.005deg (~556m) apart, a minute apart in time. The route
  // crosses 1km inside the second leg.
  const step = equatorMetersPerDegree(0.005);
  const route: TimedPoint[] = [
    { latitude: 0, longitude: 0, timestamp: 0 },
    { latitude: 0, longitude: 0.005, timestamp: 60_000 },
    { latitude: 0, longitude: 0.01, timestamp: 120_000 },
  ];

  const [first] = splits(route);
  expect(first).toBeDefined();
  expect(first!.index).toBe(1);

  // Crossing happens `overshoot` short of the second leg's end: (2 * step - 1000) / step of the
  // way through it, so the elapsed time is a minute plus that fraction of the second minute.
  const overshoot = 2 * step - 1_000;
  const fraction = 1 - overshoot / step;
  const expectedDuration = 60 + 60 * fraction;
  expect(first!.durationSeconds).toBeCloseTo(expectedDuration, 1);
  expect(first!.paceSecondsPerUnit).toBeCloseTo(expectedDuration, 1);
});

test('a route that never reaches a full kilometre has no splits', () => {
  const route: TimedPoint[] = [
    { latitude: 0, longitude: 0, timestamp: 0 },
    { latitude: 0, longitude: 0.001, timestamp: 10_000 },
  ];

  expect(splits(route)).toEqual([]);
});

test('a long jump between two fixes can cross more than one boundary', () => {
  const route: TimedPoint[] = [
    { latitude: 0, longitude: 0, timestamp: 0 },
    { latitude: 0, longitude: 0.03, timestamp: 300_000 },
  ];

  const result = splits(route, 1_000);
  expect(result.length).toBeGreaterThan(1);
  expect(result.map((s) => s.index)).toEqual(result.map((_, i) => i + 1));
});
