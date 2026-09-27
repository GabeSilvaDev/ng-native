/**
 * The checks for the testing lesson run the learner's own tests against stand-ins for their
 * components: one that works, and one that is wrong in a single way. A test earns its place by
 * passing against the first and failing against the second.
 *
 * Each stand-in is the whole tracker, the learner's own `NewHabit` included, so a test about
 * something else, such as the form, passes against both and proves nothing here. The rows are
 * drawn inline rather than with `HabitRow`, so a broken `HabitRow` breaks only the tests that
 * render it on its own.
 */
import { Component, computed, input, output, signal } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { expect } from 'vitest';
import { check, type CheckContext, type TestOutcome } from '../../check.ts';
import { NewHabit } from './solution/new-habit.ts';

const HABITS = [
  { id: 'water', name: 'Drink water', done: false },
  { id: 'read', name: 'Read ten pages', done: false },
  { id: 'walk', name: 'Walk', done: true },
];

/** What every stand-in for the screen does; each draws its rows its own way. */
class Tracker {
  protected readonly habits = signal(HABITS);
  protected readonly remaining = computed(() => this.habits().filter((h) => !h.done).length);
  private nextHabitId = 0;

  protected add(name: string): void {
    const id = 'habit-' + ++this.nextHabitId;
    this.habits.update((list) => [...list, { id, name, done: false }]);
  }

  protected toggle(id: string): void {
    this.habits.update((list) => list.map((h) => (h.id === id ? { ...h, done: !h.done } : h)));
  }
}

/** The screen as it should be. */
@Component({
  selector: 'app-root',
  imports: [NewHabit, Pressable, ScrollView, Text, View],
  template: `
    <view>
      <text>Today</text>
      <text>{{ remaining() }} left to do</text>
      <new-habit (add)="add($event)" />
      <scroll-view>
        @for (habit of habits(); track habit.id) {
          <pressable accessibilityRole="button" (press)="toggle(habit.id)">
            <text>{{ habit.name }}</text>
            <text>{{ habit.done ? 'Done' : 'To do' }}</text>
          </pressable>
        }
      </scroll-view>
    </view>
  `,
})
class WorkingApp extends Tracker {}

/** Everything but the habits: the count, the form and an empty list. */
@Component({
  selector: 'app-root',
  imports: [NewHabit, ScrollView, Text, View],
  template: `
    <view>
      <text>Today</text>
      <text>{{ remaining() }} left to do</text>
      <new-habit (add)="add($event)" />
      <scroll-view></scroll-view>
    </view>
  `,
})
class WithoutHabits extends Tracker {}

/** Everything, except that pressing a habit does nothing. */
@Component({
  selector: 'app-root',
  imports: [NewHabit, Pressable, ScrollView, Text, View],
  template: `
    <view>
      <text>Today</text>
      <text>{{ remaining() }} left to do</text>
      <new-habit (add)="add($event)" />
      <scroll-view>
        @for (habit of habits(); track habit.id) {
          <pressable accessibilityRole="button">
            <text>{{ habit.name }}</text>
            <text>{{ habit.done ? 'Done' : 'To do' }}</text>
          </pressable>
        }
      </scroll-view>
    </view>
  `,
})
class PressDoesNothing extends Tracker {}

/** A row that never says it was pressed. */
@Component({
  selector: 'habit-row',
  imports: [Pressable, Text],
  template: `
    <pressable accessibilityRole="button">
      <text>{{ name() }}</text>
      <text>{{ done() ? 'Done' : 'To do' }}</text>
    </pressable>
  `,
})
class SilentRow {
  readonly name = input.required<string>();
  readonly done = input(false);
  readonly toggle = output<void>();
}

type Replace = Readonly<Record<string, Record<string, unknown>>>;

const failed = (outcomes: readonly TestOutcome[]) => outcomes.filter((outcome) => !outcome.ok);

async function passing({ runTests }: CheckContext): Promise<void> {
  const outcomes = await runTests('app.spec.ts');
  expect(failed(outcomes).map((outcome) => outcome.name)).toEqual([]);
}

/** The tests that pass with `working` in place and fail with `broken`. */
async function caught(
  { runTests }: CheckContext,
  working: Replace,
  broken: Replace,
): Promise<string[]> {
  const passed = new Set(
    (await runTests('app.spec.ts', { replace: working }))
      .filter((outcome) => outcome.ok)
      .map((outcome) => outcome.name),
  );
  return failed(await runTests('app.spec.ts', { replace: broken }))
    .map((outcome) => outcome.name)
    .filter((name) => passed.has(name));
}

const WORKING: Replace = { 'app.ts': { App: WorkingApp } };

check(
  1,
  'Your tests pass',
  async (context) => {
    await passing(context);
  },
  'Run the tests: each failure says what it expected and what it found.',
);

check(
  1,
  'They fail when the habits are missing',
  async (context) => {
    const names = await caught(context, WORKING, { 'app.ts': { App: WithoutHabits } });
    expect(names).not.toEqual([]);
  },
  "Add a test that finds a habit on screen, such as expect(screen.getByText('Drink water')).toBeTruthy().",
);

check(
  2,
  'They fail when pressing a habit does nothing',
  async (context) => {
    await passing(context);
    const names = await caught(context, WORKING, { 'app.ts': { App: PressDoesNothing } });
    expect(names).not.toEqual([]);
  },
  'Add a test that presses a habit with userEvent.press and expects the count to go down.',
);

check(
  3,
  'They fail when HabitRow does not say it was pressed',
  async (context) => {
    await passing(context);
    const names = await caught(context, WORKING, {
      ...WORKING,
      'habit-row.ts': { HabitRow: SilentRow },
    });
    expect(names).not.toEqual([]);
  },
  'Render HabitRow on its own with on: { toggle } from vi.fn(), press it, and expect toggle to have been called.',
);
