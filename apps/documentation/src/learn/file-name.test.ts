import { describe, expect, it } from 'vitest';
import { checkFileName } from './file-name.ts';

describe('checkFileName', () => {
  it('takes a kebab-case TypeScript name', () => {
    expect(checkFileName('new-habit.ts', ['app.ts'])).toEqual({ name: 'new-habit.ts' });
    expect(checkFileName('new-habit.spec.ts', [])).toEqual({ name: 'new-habit.spec.ts' });
  });

  it('adds .ts when it is left off, and ignores spaces around the name', () => {
    expect(checkFileName('  habit-list ', [])).toEqual({ name: 'habit-list.ts' });
  });

  it('refuses a name that is not kebab-case', () => {
    for (const typed of [
      'NewHabit.ts',
      'new_habit.ts',
      'new habit',
      '-habit.ts',
      'a/b.ts',
      'x.js',
    ]) {
      expect(checkFileName(typed, [])).toHaveProperty('error');
    }
  });

  it('refuses nothing at all, and a name the lesson already has', () => {
    expect(checkFileName(' ', [])).toHaveProperty('error');
    expect(checkFileName('app', ['app.ts'])).toEqual({
      error: 'There is already a file called app.ts.',
    });
  });
});
