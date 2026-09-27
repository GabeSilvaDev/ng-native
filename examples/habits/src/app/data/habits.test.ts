import { expect, test } from 'vitest';
import {
  calendarGrid,
  completionRate,
  currentStreak,
  isoDate,
  toggleCompletion,
} from './habits.ts';

test('a date is local, not UTC', () => {
  expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  expect(isoDate(new Date(2026, 8, 25))).toBe('2026-09-25');
});

test('toggling adds or removes one date, without touching the set passed in', () => {
  const days = new Set(['2026-09-01']);

  const added = toggleCompletion(days, '2026-09-02');
  expect([...added].sort()).toEqual(['2026-09-01', '2026-09-02']);
  expect(days.has('2026-09-02')).toBe(false);

  const removed = toggleCompletion(added, '2026-09-01');
  expect([...removed]).toEqual(['2026-09-02']);
});

test('a streak counts consecutive days ending today', () => {
  const today = new Date(2026, 8, 25);
  const days = new Set(['2026-09-25', '2026-09-24', '2026-09-23', '2026-09-20']);
  expect(currentStreak(days, today)).toBe(3);
});

test('a streak still counts if today has not been done yet, up to yesterday', () => {
  const today = new Date(2026, 8, 25);
  const days = new Set(['2026-09-24', '2026-09-23']);
  expect(currentStreak(days, today)).toBe(2);
});

test('a streak is broken by a day missed entirely, not just today', () => {
  const today = new Date(2026, 8, 25);
  expect(currentStreak(new Set(['2026-09-22']), today)).toBe(0);
  expect(currentStreak(new Set(), today)).toBe(0);
});

test('completion rate is the fraction of habits done, and zero with no habits at all', () => {
  expect(completionRate(4, 3)).toBeCloseTo(0.75);
  expect(completionRate(0, 0)).toBe(0);
});

test('the calendar grid is one entry per day, oldest first, with today marked', () => {
  const today = new Date(2026, 8, 25);
  const grid = calendarGrid(new Set(['2026-09-25', '2026-09-24']), 2, today);

  expect(grid).toHaveLength(14);
  expect(grid[0]!.date).toBe('2026-09-12');
  expect(grid.at(-1)).toEqual({ date: '2026-09-25', done: true, today: true });
  expect(grid.at(-2)).toEqual({ date: '2026-09-24', done: true, today: false });
  expect(grid.at(-3)).toEqual({ date: '2026-09-23', done: false, today: false });
});
