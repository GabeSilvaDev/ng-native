import { expect, test } from 'vitest';
import { excerpt, matchesQuery, sortNotes, wordCount, type Note } from './note.ts';

function note(overrides: Partial<Note>): Note {
  return { id: 'n1', title: 'Title', body: 'Body', pinned: false, updatedAt: 0, ...overrides };
}

test('pinned notes come first, then most recently updated', () => {
  const notes = [
    note({ id: 'old', updatedAt: 1 }),
    note({ id: 'new', updatedAt: 3 }),
    note({ id: 'pinned-old', pinned: true, updatedAt: 0 }),
    note({ id: 'pinned-new', pinned: true, updatedAt: 2 }),
  ];

  expect(sortNotes(notes).map((n) => n.id)).toEqual(['pinned-new', 'pinned-old', 'new', 'old']);
});

test('a search matches the title or the body, ignoring case', () => {
  const shopping = note({ title: 'Grocery list', body: 'Oat milk, coffee' });

  expect(matchesQuery(shopping, 'grocery')).toBe(true);
  expect(matchesQuery(shopping, 'COFFEE')).toBe(true);
  expect(matchesQuery(shopping, 'flowers')).toBe(false);
  expect(matchesQuery(shopping, '  ')).toBe(true);
});

test('word count treats empty and whitespace-only text as zero words', () => {
  expect(wordCount('')).toBe(0);
  expect(wordCount('   ')).toBe(0);
  expect(wordCount('one')).toBe(1);
  expect(wordCount('a couple of words')).toBe(4);
  expect(wordCount('  extra   space   between ')).toBe(3);
});

test('an excerpt is cut to length, and shorter text is left alone', () => {
  expect(excerpt('short body')).toBe('short body');
  expect(excerpt('line one\nline two')).toBe('line one line two');
  expect(excerpt('x'.repeat(90), 10)).toBe(`${'x'.repeat(10)}...`);
});
