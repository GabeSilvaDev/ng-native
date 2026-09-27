import { withComponentInputBinding } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import {
  gestureOf,
  render,
  screen,
  userEvent,
  waitFor,
  type FakeFabric,
  type FakeFabricNode,
} from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';
import { CARDS, columnAt, moveCard } from './kanban-model.ts';

const LAYOUT = { inset: 16, width: 290, gap: 14 };
const titlesIn = (cards: typeof CARDS, column: string) =>
  cards.filter((card) => card.column === column).map((card) => card.id);

describe('the board', () => {
  test('moves a card to the end of another column', () => {
    const moved = moveCard(CARDS, 'k1', 'review');
    expect(titlesIn(moved, 'review')).toEqual(['k7', 'k8', 'k1']);
    expect(titlesIn(moved, 'backlog')).toEqual(['k2', 'k3']);
    expect(moved).toHaveLength(CARDS.length);
  });

  test('moves a card to a place in a column, and reorders within one', () => {
    expect(titlesIn(moveCard(CARDS, 'k1', 'review', 1), 'review')).toEqual(['k7', 'k1', 'k8']);
    expect(titlesIn(moveCard(CARDS, 'k6', 'doing', 0), 'doing')).toEqual(['k6', 'k4', 'k5']);
    expect(titlesIn(moveCard(CARDS, 'k1', 'backlog'), 'backlog')).toEqual(['k2', 'k3', 'k1']);
  });

  test('moves a card into an empty column', () => {
    const emptied = moveCard(moveCard(CARDS, 'k9', 'doing'), 'k10', 'doing');
    expect(titlesIn(moveCard(emptied, 'k1', 'done'), 'done')).toEqual(['k1']);
  });

  test('knows which column a finger is over, however far the board is scrolled', () => {
    expect(columnAt(10, 0, LAYOUT)).toBeNull();
    expect(columnAt(100, 0, LAYOUT)).toBe('backlog');
    expect(columnAt(100, 304, LAYOUT)).toBe('doing');
    expect(columnAt(350, 0, LAYOUT)).toBe('doing');
    expect(columnAt(300, 2000, LAYOUT)).toBe('done');
  });
});

const flatten = (nodes: readonly FakeFabricNode[]): FakeFabricNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

/** The card whose label starts with `title`. */
const cardNode = (fabric: FakeFabric, title: string) =>
  flatten(fabric.committed).find((node) =>
    String(node.props['accessibilityLabel'] ?? '').startsWith(`${title},`),
  )!;

async function boot() {
  const app = await render(App, {
    providers: [provideNativeRouter(routes, withComponentInputBinding())],
  });
  await app.componentRef.injector.get(NativeNavigation).push('/kanban');
  await screen.findByLabelText('Review, 2 cards');
  return app;
}

describe('kanban', () => {
  test('a tapped card moves from the bar to another column', async () => {
    const { fabric } = await boot();
    gestureOf(cardNode(fabric, 'Onboarding illustrations'), 'Tap').callbacks['onEnd']!();
    await userEvent.press(await screen.findByRole('button', { name: 'Move to Review' }));
    await waitFor(() => expect(screen.getByLabelText('Review, 3 cards')).toBeTruthy());
    expect(screen.getByLabelText('Backlog, 2 cards')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Move to Review' })).toBeNull();
  });

  test('a card held and dragged over another column drops into it', async () => {
    const { fabric } = await boot();
    const pan = gestureOf(cardNode(fabric, 'Crash when a photo is huge'), 'Pan');
    const at = (x: number) => ({ absoluteX: x, absoluteY: 400, x: 20, y: 20 }) as never;
    pan.callbacks['onStart']!(at(350));
    await screen.findByText('2 pt, Tom');
    pan.callbacks['onUpdate']!(at(660));
    pan.callbacks['onEnd']!(at(660));
    pan.callbacks['onFinalize']!();
    await waitFor(() => expect(screen.getByLabelText('Review, 3 cards')).toBeTruthy());
    expect(screen.getByLabelText('Doing, 2 cards')).toBeTruthy();
    expect(screen.queryByText('2 pt, Tom')).toBeNull();
  });
});
