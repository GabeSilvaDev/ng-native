/**
 * Where a learner is in each lesson: their files, the step they are on and the steps they have
 * finished, kept in `localStorage` so closing the tab loses nothing.
 */
import { Service, signal } from '@angular/core';
import type { Files } from './protocol.ts';

export interface LessonProgress {
  readonly files: Files;
  /** Counting from 0. */
  readonly step: number;
  /** Every step whose checks have all passed, counting from 0. */
  readonly done: readonly number[];
}

const KEY = 'angular-native-learn:v1:';

const isStep = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0;

/** Files that are all text, and include the `app.ts` every lesson starts from. */
function isFiles(value: unknown): value is Files {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return (
    'app.ts' in value && Object.values(value).every((contents) => typeof contents === 'string')
  );
}

/**
 * Stored progress, if it is in a shape a lesson can open: files that are all text and include the
 * `app.ts` every lesson starts from, and steps as counts from 0. Anything else - progress an earlier
 * version of the site saved, or storage something else wrote to - starts the lesson afresh rather
 * than leaving a page that cannot render.
 */
export function parseProgress(stored: string | null): LessonProgress | undefined {
  if (!stored) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    return undefined;
  }
  if (typeof value !== 'object' || value === null) return undefined;
  const { files, step, done } = value as Record<string, unknown>;
  if (!isFiles(files)) return undefined;
  if (!isStep(step) || !Array.isArray(done) || !done.every(isStep)) return undefined;
  return { files, step, done };
}

function read(slug: string): LessonProgress | undefined {
  try {
    return parseProgress(localStorage.getItem(KEY + slug));
  } catch {
    // Storage refused: start the lesson afresh.
    return undefined;
  }
}

@Service()
export class LearnProgress {
  /** Bumped on every save, so a list of lessons can show what changed. */
  private readonly version = signal(0);

  get(slug: string): LessonProgress | undefined {
    this.version();
    return read(slug);
  }

  save(slug: string, progress: LessonProgress): void {
    try {
      localStorage.setItem(KEY + slug, JSON.stringify(progress));
    } catch {
      // Private browsing, or a full quota. The lesson still works; it just will not be remembered.
    }
    this.version.update((n) => n + 1);
  }

  forget(slug: string): void {
    try {
      localStorage.removeItem(KEY + slug);
    } catch {
      // As above.
    }
    this.version.update((n) => n + 1);
  }
}
