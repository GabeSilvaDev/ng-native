import { expect, test } from 'vitest';
import { Queue } from './queue.ts';
import type { Track } from '../catalogue/catalogue.ts';

// A fake player source: three tracks with no real audio behind them, so the queue's own logic -
// order, position, shuffle, repeat - is exercised with nothing native involved.
const fake = (id: string): Track => ({
  id,
  title: id,
  albumId: 'fake-album',
  artist: 'Fake Artist',
  duration: 1,
  source: -1,
});
const TRACKS = [fake('a'), fake('b'), fake('c')];

const queue = () => new Queue();

test('loads a queue starting at the first track', () => {
  const q = queue();
  q.load(TRACKS);
  expect(q.current()?.id).toBe('a');
  expect(q.hasPrevious()).toBe(false);
  expect(q.hasNext()).toBe(true);
});

test('loads a queue starting at a chosen track', () => {
  const q = queue();
  q.load(TRACKS, 'b');
  expect(q.current()?.id).toBe('b');
});

test('next and previous move through the queue in order', () => {
  const q = queue();
  q.load(TRACKS);

  q.next();
  expect(q.current()?.id).toBe('b');
  q.next();
  expect(q.current()?.id).toBe('c');
  q.next();
  expect(q.current()?.id).toBe('c'); // nothing after the last track, with repeat off
  expect(q.hasNext()).toBe(false);

  q.previous();
  expect(q.current()?.id).toBe('b');
});

test('repeating all wraps at both ends', () => {
  const q = queue();
  q.load(TRACKS);
  q.cycleRepeat(); // off -> all

  q.next();
  q.next();
  expect(q.current()?.id).toBe('c');
  q.next();
  expect(q.current()?.id).toBe('a');

  q.previous();
  expect(q.current()?.id).toBe('c');
});

test('repeat cycles off, all, one', () => {
  const q = queue();
  expect(q.repeat()).toBe('off');
  q.cycleRepeat();
  expect(q.repeat()).toBe('all');
  q.cycleRepeat();
  expect(q.repeat()).toBe('one');
  q.cycleRepeat();
  expect(q.repeat()).toBe('off');
});

test('shuffling keeps the current track first and visits every track once', () => {
  const q = queue();
  q.load(TRACKS, 'b');

  q.toggleShuffle();

  expect(q.current()?.id).toBe('b');
  const seen = new Set([q.current()!.id]);
  q.next();
  seen.add(q.current()!.id);
  q.next();
  seen.add(q.current()!.id);
  expect(seen).toEqual(new Set(['a', 'b', 'c']));
});

test('turning shuffle off restores the original order', () => {
  const q = queue();
  q.load(TRACKS);
  q.toggleShuffle();
  q.toggleShuffle();

  expect(q.current()?.id).toBe('a');
  q.next();
  expect(q.current()?.id).toBe('b');
});
