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

function read(slug: string): LessonProgress | undefined {
  try {
    const stored = localStorage.getItem(KEY + slug);
    return stored ? (JSON.parse(stored) as LessonProgress) : undefined;
  } catch {
    // Storage refused or held something else: start the lesson afresh.
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
