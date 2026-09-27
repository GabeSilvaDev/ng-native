import { render, screen, settle, userEvent } from '@ng-native/testing';
import { expect, vi } from 'vitest';
import { check, parentOf } from '../../check.ts';
import { App } from './solution/app.ts';
import { HabitRow } from './solution/habit-row.ts';

check(
  1,
  'Pressing a habit ticks it off, and pressing it again puts it back',
  async () => {
    await render(App);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    await userEvent.press(screen.getByText('Drink water'));
    expect(screen.getByText('1 left to do')).toBeTruthy();
    expect(screen.getAllByText('Done')).toHaveLength(2);
    await userEvent.press(screen.getByText('Drink water'));
    expect(screen.getByText('2 left to do')).toBeTruthy();
  },
  'Make the card a <pressable accessibilityRole="button" (press)="toggle(habit.id)">, and update the signal in toggle().',
);

check(
  2,
  'A card changes colour while it is touched, and changes back when the finger lifts',
  async () => {
    const { fabric } = await render(App);
    const card = () => parentOf(fabric.committed, screen.getByText('Drink water'))!;
    const resting = card().props['backgroundColor'];
    // A finger down on the words, as the responder sees it, and up again a task later.
    fabric.emit(screen.getByText('Drink water'), 'topTouchStart', {
      touches: [{}],
      changedTouches: [{}],
    });
    await settle();
    expect(card().props['backgroundColor']).not.toEqual(resting);
    fabric.emit(screen.getByText('Drink water'), 'topTouchEnd', {
      touches: [],
      changedTouches: [{}],
    });
    await settle();
    expect(card().props['backgroundColor']).toEqual(resting);
  },
  'Add a .habit:active rule with a background-color of its own, next to the .habit rule.',
  { readsStyles: true },
);

check(
  3,
  'HabitRow takes a name and whether it is done',
  async () => {
    await render(HabitRow, { inputs: { name: 'Stretch', done: true } });
    expect(screen.getByText('Stretch')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  },
  'Export a HabitRow component from habit-row.ts, with name = input.required<string>() and done = input(false).',
);

check(
  3,
  'HabitRow says when it is pressed',
  async () => {
    const toggle = vi.fn();
    await render(HabitRow, { inputs: { name: 'Stretch' }, on: { toggle } });
    await userEvent.press(screen.getByRole('button'));
    expect(toggle).toHaveBeenCalledTimes(1);
  },
  'Give HabitRow toggle = output<void>(), and emit it from the pressable: (press)="toggle.emit()".',
);

check(
  3,
  'The screen draws its rows with HabitRow',
  async ({ file }) => {
    expect(file('app.ts')).toContain('<habit-row');
    await render(App);
    await userEvent.press(screen.getByText('Read ten pages'));
    expect(screen.getByText('1 left to do')).toBeTruthy();
  },
  'Use <habit-row [name]="habit.name" [done]="habit.done" (toggle)="toggle(habit.id)" /> inside the @for, and add HabitRow to imports.',
);
