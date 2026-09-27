import { database } from '@ng-native/expo/database';

/**
 * The habit tracker's own database: a habit's fixed details, and one row per day it was done.
 *
 * A value rather than a service, because the schema belongs to this feature rather than to an
 * injector - see [Database](/packages/expo/database).
 */
export const habitsDatabase = database('habits.db', [
  {
    to: 1,
    up: (db) =>
      db.execAsync(`
        CREATE TABLE habit (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          colour TEXT NOT NULL,
          reminder_time TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE completion (
          habit_id TEXT NOT NULL,
          date TEXT NOT NULL,
          PRIMARY KEY (habit_id, date)
        );
      `),
  },
]);
