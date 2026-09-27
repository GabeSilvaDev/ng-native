import type { WritableSignal } from '@angular/core';
import { render, screen, type FakeFabricNode } from '@ng-native/testing';
import { expect } from 'vitest';
import { check, parentOf } from '../../check.ts';
import { App } from './solution/app.ts';

const HABITS = ['Drink water', 'Read ten pages', 'Walk'];

/** The app's habits signal, which the template reads; `protected`, so reached past its type. */
const habitsOf = (app: App) =>
  (app as unknown as { habits: WritableSignal<{ id: string; name: string; done: boolean }[]> })
    .habits;

/** Every node above `node`, nearest first. */
function ancestorsOf(roots: readonly FakeFabricNode[], node: FakeFabricNode): FakeFabricNode[] {
  const found: FakeFabricNode[] = [];
  for (let parent = parentOf(roots, node); parent; parent = parentOf(roots, parent)) {
    found.push(parent);
  }
  return found;
}

const isScrollView = (node: FakeFabricNode) => node.viewName.endsWith('ScrollView');

check(
  1,
  'Every habit in the list is on screen',
  async () => {
    await render(App);
    for (const name of HABITS) expect(screen.getByText(name)).toBeTruthy();
  },
  'Add the habits signal to the class, and wrap the card in @for (habit of habits(); track habit.id).',
);

check(
  1,
  'Each habit has a card of its own',
  async () => {
    const { fabric } = await render(App);
    const rows = HABITS.map((name) => parentOf(fabric.committed, screen.getByText(name)));
    expect(new Set(rows).size).toBe(3);
    for (const row of rows) expect(row?.props['flexDirection']).toBe('row');
  },
  'The whole <view class="habit"> goes inside the @for, with {{ habit.name }} in its first text.',
  { readsStyles: true },
);

check(
  2,
  'Each card says whether the habit is done',
  async () => {
    await render(App);
    expect(screen.getAllByText('To do')).toHaveLength(2);
    expect(screen.getAllByText('Done')).toHaveLength(1);
  },
  "Write {{ habit.done ? 'Done' : 'To do' }} in the status text.",
);

check(
  2,
  'The count comes from the list',
  async () => {
    const { instance, rerender } = await render(App);
    habitsOf(instance).set([
      { id: 'stretch', name: 'Stretch', done: false },
      { id: 'sleep', name: 'Sleep', done: true },
    ]);
    await rerender();
    expect(screen.getByText('1 left to do')).toBeTruthy();
  },
  'Add remaining = computed(() => ...) counting the habits that are not done, and show remaining().',
);

check(
  2,
  'An empty list says so',
  async () => {
    const { instance, rerender } = await render(App);
    habitsOf(instance).set([]);
    await rerender();
    expect(screen.getByText('No habits yet')).toBeTruthy();
  },
  'Add an @empty block after the @for, with a text that says No habits yet.',
);

check(
  3,
  'The habits scroll, and the title and count stay put',
  async () => {
    const { fabric } = await render(App);
    for (const name of HABITS) {
      expect(ancestorsOf(fabric.committed, screen.getByText(name)).some(isScrollView)).toBe(true);
    }
    for (const text of ['Today', '2 left to do']) {
      expect(ancestorsOf(fabric.committed, screen.getByText(text)).some(isScrollView)).toBe(false);
    }
  },
  'Import ScrollView, and put the @for, with its @empty, inside a <scroll-view>. Leave the title and the count above it.',
);

check(
  3,
  'The scrolling content spaces its rows',
  async () => {
    const { fabric } = await render(App);
    const row = parentOf(fabric.committed, screen.getByText('Drink water'))!;
    const content = parentOf(fabric.committed, row);
    expect(content && parentOf(fabric.committed, content)?.viewName).toMatch(/ScrollView$/);
    expect(content?.props['gap'] ?? content?.props['rowGap']).toBeGreaterThan(0);
  },
  'Give the scroll view [contentContainerStyle]="{ gap: 8 }": the gap goes on the view that holds the rows, not on the scroll view itself.',
);
