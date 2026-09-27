import { Service, computed, signal } from '@angular/core';
import { habitsDatabase } from './habits-database.ts';

export interface Habit {
  readonly id: string;
  readonly name: string;
  readonly colour: string;
  /** `HH:mm`, or `null` for no daily reminder. */
  readonly reminderTime: string | null;
  readonly createdAt: string;
}

/** One day as `YYYY-MM-DD`, in local time - never UTC, or a completion made at 11pm lands on the wrong day. */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Adds or removes one date from a set of completions, without touching the set passed in. */
export function toggleCompletion(days: ReadonlySet<string>, date: string): ReadonlySet<string> {
  const next = new Set(days);
  if (next.has(date)) next.delete(date);
  else next.add(date);
  return next;
}

/**
 * The days in a row a habit has been done, counting back from today. A habit not yet done today
 * still has yesterday's streak - it is only broken once a whole day passes with nothing logged.
 */
export function currentStreak(days: ReadonlySet<string>, today = new Date()): number {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(isoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(isoDate(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(isoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** The fraction of habits done on a given day, for the progress ring. */
export function completionRate(total: number, done: number): number {
  return total === 0 ? 0 : done / total;
}

export interface GridDay {
  readonly date: string;
  readonly done: boolean;
  readonly today: boolean;
}

/**
 * `weeks * 7` days ending today, oldest first, for the calendar grid on the habit detail screen.
 * Laid out as CSS grid columns (one column per week, seven rows), not aligned to Sunday - the
 * point is a quick read of "most days", not a real calendar.
 */
export function calendarGrid(
  days: ReadonlySet<string>,
  weeks: number,
  today = new Date(),
): readonly GridDay[] {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const total = weeks * 7;
  const grid: GridDay[] = [];
  for (let i = total - 1; i >= 0; i--) {
    const date = new Date(end);
    date.setDate(date.getDate() - i);
    const iso = isoDate(date);
    grid.push({ date: iso, done: days.has(iso), today: i === 0 });
  }
  return grid;
}

const PALETTE = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6'];

/**
 * Every habit, and which days each one was done.
 *
 * Backed by SQLite through `habitsDatabase`, written through best-effort: a write updates the
 * signals first so the UI never waits on disk, then persists in the background. On a platform with
 * no `expo-sqlite` module - Node under the tests, a browser preview - persistence quietly does
 * nothing and the in-memory seed stands in for it, the same "inert, not broken" contract the rest
 * of the Expo integrations follow.
 */
@Service()
export class Habits {
  private readonly all = signal<readonly Habit[]>(seedHabits());
  private readonly done = signal<ReadonlyMap<string, ReadonlySet<string>>>(seedCompletions());

  readonly habits = this.all.asReadonly();
  readonly palette: readonly string[] = PALETTE;

  constructor() {
    void this.load();
  }

  find(id: string): Habit | undefined {
    return this.all().find((habit) => habit.id === id);
  }

  completions(id: string): ReadonlySet<string> {
    return this.done().get(id) ?? new Set();
  }

  isDone(id: string, date = new Date()): boolean {
    return this.completions(id).has(isoDate(date));
  }

  streak(id: string, today = new Date()): number {
    return currentStreak(this.completions(id), today);
  }

  readonly todayRate = computed(() => {
    const habits = this.all();
    const today = isoDate(new Date());
    const done = habits.filter((habit) => this.done().get(habit.id)?.has(today)).length;
    return completionRate(habits.length, done);
  });

  nameTaken(name: string, exceptId?: string): boolean {
    const clean = name.trim().toLowerCase();
    return this.all().some((h) => h.id !== exceptId && h.name.trim().toLowerCase() === clean);
  }

  toggleToday(id: string, date = new Date()): void {
    const iso = isoDate(date);
    this.done.update((all) => {
      const next = new Map(all);
      next.set(id, toggleCompletion(next.get(id) ?? new Set(), iso));
      return next;
    });
    const nowDone = this.isDone(id, date);
    void habitsDatabase
      .ready()
      .then((db) =>
        nowDone
          ? db.runAsync('INSERT OR IGNORE INTO completion (habit_id, date) VALUES (?, ?)', id, iso)
          : db.runAsync('DELETE FROM completion WHERE habit_id = ? AND date = ?', id, iso),
      )
      .catch(() => {});
  }

  create(habit: { name: string; colour: string; reminderTime: string | null }): Habit {
    const created: Habit = {
      id: `h${Date.now().toString(36)}${Math.floor(Math.random() * 1_000).toString(36)}`,
      name: habit.name.trim(),
      colour: habit.colour,
      reminderTime: habit.reminderTime,
      createdAt: isoDate(new Date()),
    };
    this.all.update((all) => [...all, created]);
    void habitsDatabase
      .ready()
      .then((db) => this.persistHabit(db, created))
      .catch(() => {});
    return created;
  }

  update(id: string, changes: { name: string; colour: string; reminderTime: string | null }): void {
    this.all.update((all) =>
      all.map((h) => (h.id === id ? { ...h, ...changes, name: changes.name.trim() } : h)),
    );
    const updated = this.find(id);
    if (!updated) return;
    void habitsDatabase
      .ready()
      .then((db) => this.persistHabit(db, updated))
      .catch(() => {});
  }

  remove(id: string): void {
    this.all.update((all) => all.filter((h) => h.id !== id));
    this.done.update((all) => {
      const next = new Map(all);
      next.delete(id);
      return next;
    });
    void habitsDatabase
      .ready()
      .then((db) =>
        db.withTransactionAsync(async () => {
          await db.runAsync('DELETE FROM habit WHERE id = ?', id);
          await db.runAsync('DELETE FROM completion WHERE habit_id = ?', id);
        }),
      )
      .catch(() => {});
  }

  private persistHabit(db: Awaited<ReturnType<typeof habitsDatabase.ready>>, habit: Habit) {
    return db.runAsync(
      `INSERT INTO habit (id, name, colour, reminder_time, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, colour = excluded.colour,
         reminder_time = excluded.reminder_time`,
      habit.id,
      habit.name,
      habit.colour,
      habit.reminderTime,
      habit.createdAt,
    );
  }

  /**
   * Loads whatever is already on disk; leaves the seed in place if there is nothing there yet, or
   * if there is no database at all - Node under the tests, a browser preview.
   */
  private async load(): Promise<void> {
    try {
      await this.loadFromDatabase();
    } catch {
      // The in-memory seed already stands in for it.
    }
  }

  private async loadFromDatabase(): Promise<void> {
    const db = await habitsDatabase.ready();
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      colour: string;
      reminder_time: string | null;
      created_at: string;
    }>('SELECT * FROM habit ORDER BY created_at');

    if (rows.length === 0) {
      // First launch: persist the seed data so the next launch reads it back from disk too.
      await db.withTransactionAsync(async () => {
        for (const habit of this.all()) await this.persistHabit(db, habit);
        for (const [habitId, dates] of this.done())
          for (const date of dates)
            await db.runAsync(
              'INSERT OR IGNORE INTO completion (habit_id, date) VALUES (?, ?)',
              habitId,
              date,
            );
      });
      return;
    }

    const completions = await db.getAllAsync<{ habit_id: string; date: string }>(
      'SELECT habit_id, date FROM completion',
    );
    const grouped = new Map<string, Set<string>>();
    for (const row of completions) {
      const set = grouped.get(row.habit_id) ?? new Set<string>();
      set.add(row.date);
      grouped.set(row.habit_id, set);
    }

    this.all.set(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        colour: row.colour,
        reminderTime: row.reminder_time,
        createdAt: row.created_at,
      })),
    );
    this.done.set(grouped);
  }
}

/** A handful of habits with a colour each, so a first launch has something to pick from. */
function seedHabits(): Habit[] {
  return [
    {
      id: 'seed-water',
      name: 'Drink water',
      colour: PALETTE[4]!,
      reminderTime: '09:00',
      createdAt: isoDate(daysAgo(60)),
    },
    {
      id: 'seed-read',
      name: 'Read',
      colour: PALETTE[3]!,
      reminderTime: '21:00',
      createdAt: isoDate(daysAgo(60)),
    },
    {
      id: 'seed-exercise',
      name: 'Exercise',
      colour: PALETTE[0]!,
      reminderTime: '07:00',
      createdAt: isoDate(daysAgo(45)),
    },
    {
      id: 'seed-meditate',
      name: 'Meditate',
      colour: PALETTE[5]!,
      reminderTime: null,
      createdAt: isoDate(daysAgo(30)),
    },
  ];
}

function daysAgo(n: number, today = new Date()): Date {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
}

/**
 * A deterministic pattern of history for each seed habit, going back 60 days, so streaks and the
 * calendar grid look alive from the first launch rather than empty. Deterministic (no `Math.random`)
 * so a screenshot taken twice looks the same.
 */
function seedCompletions(): Map<string, Set<string>> {
  const today = new Date();
  const patterns: Record<string, (day: number) => boolean> = {
    // Done every day for the last nine, then a realistic gap further back.
    'seed-water': (day) => day < 9 || day % 3 !== 0,
    'seed-read': (day) => day < 5 || day % 2 === 0,
    // Not yet done today, but a six-day streak on the line - a good habit to check off for real.
    'seed-exercise': (day) => day > 0 && (day < 7 || day % 2 === 0),
    'seed-meditate': (day) => day < 14 && day % 4 !== 3,
  };
  const map = new Map<string, Set<string>>();
  for (const [id, done] of Object.entries(patterns)) {
    const set = new Set<string>();
    for (let day = 0; day < 60; day++) {
      if (done(day)) set.add(isoDate(daysAgo(day, today)));
    }
    map.set(id, set);
  }
  return map;
}
