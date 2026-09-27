import { withComponentInputBinding } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import {
  gestureOf,
  render,
  screen,
  userEvent,
  waitFor,
  type FakeFabricNode,
} from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';
import { lanes, minuteAt, monthGrid, type CalendarEvent } from './calendar-model.ts';

describe('the calendar model', () => {
  test('lays a month out in whole weeks, Monday first', () => {
    const weeks = monthGrid(2026, 8);
    expect(weeks[0]![0]).toBe('2026-08-31');
    expect(weeks.at(-1)!.at(-1)).toBe('2026-10-04');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  test('a month that starts on a Monday has no days of the one before', () => {
    expect(monthGrid(2026, 5)[0]![0]).toBe('2026-06-01');
  });

  test('turns a place on the timeline into a quarter hour inside the day', () => {
    expect(minuteAt(0)).toBe(7 * 60);
    expect(minuteAt(64 * 2.5)).toBe(9 * 60 + 30);
    expect(minuteAt(80)).toBe(8 * 60 + 15);
    expect(minuteAt(-50)).toBe(7 * 60);
    expect(minuteAt(64 * 40)).toBe(22 * 60);
  });

  test('puts overlapping events side by side, and the rest full width', () => {
    const event = (id: string, start: number, end: number): CalendarEvent => ({
      id,
      day: '2026-09-27',
      title: id,
      start,
      end,
      calendar: 'work',
    });
    const placed = lanes([event('a', 600, 690), event('b', 660, 720), event('c', 800, 860)]);
    expect(placed.get('a')).toEqual({ lane: 0, of: 2 });
    expect(placed.get('b')).toEqual({ lane: 1, of: 2 });
    expect(placed.get('c')).toEqual({ lane: 0, of: 1 });
  });
});

const flatten = (nodes: readonly FakeFabricNode[]): FakeFabricNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

async function boot() {
  const app = await render(App, {
    providers: [provideNativeRouter(routes, withComponentInputBinding())],
  });
  await app.componentRef.injector.get(NativeNavigation).push('/calendar');
  await screen.findByRole('button', { name: 'Add event at 10:00' });
  return app;
}

describe('calendar', () => {
  test('a chosen day shows its events, and the add button puts one on it', async () => {
    await boot();
    const tomorrow = screen
      .getAllByRole('button')
      .find((node) => /, 2 events$/.test(String(node.props['accessibilityLabel'])))!;
    await userEvent.press(tomorrow);
    await screen.findByLabelText(/^Planning, 14:00 to 15:30$/);
    await userEvent.press(screen.getByRole('button', { name: 'Add event at 10:00' }));
    await screen.findByLabelText('New event, 10:00 to 11:00');
  });

  test('an event is drawn by holding on the timeline and dragging down', async () => {
    const { fabric } = await boot();
    const drawing = flatten(fabric.committed)
      .map((node) => {
        try {
          return gestureOf(node, 'Pan');
        } catch {
          return null;
        }
      })
      .find(Boolean)!;
    drawing.callbacks['onStart']!({ y: 64 * 6 } as never);
    await screen.findByText('13:00 to 13:30');
    drawing.callbacks['onUpdate']!({ y: 64 * 7.5 } as never);
    drawing.callbacks['onEnd']!({} as never);
    drawing.callbacks['onFinalize']!();
    await waitFor(() => expect(screen.getByLabelText('New event, 13:00 to 14:30')).toBeTruthy());
  });
});
