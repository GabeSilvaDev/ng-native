import { withComponentInputBinding } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import { fireEvent, render, screen, userEvent } from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';
import { Notes, inline, shortcut, wrapped } from './notes-model.ts';

describe('the note model', () => {
  test('turns a Markdown prefix into the block it asks for', () => {
    expect(shortcut('# Plans')).toEqual({ kind: 'heading', text: 'Plans' });
    expect(shortcut('- milk')).toEqual({ kind: 'bullet', text: 'milk' });
    expect(shortcut('[] eggs')).toEqual({ kind: 'check', text: 'eggs' });
    expect(shortcut('[x] bread')).toEqual({ kind: 'check', text: 'bread', done: true });
    expect(shortcut('> said so')).toEqual({ kind: 'quote', text: 'said so' });
    expect(shortcut('#hashtag')).toBeNull();
  });

  test('reads the marks, nested as written, and leaves an unclosed one as it is', () => {
    expect(inline('a **b *c* d** e')).toEqual([
      { text: 'a ' },
      { text: 'b ', bold: true },
      { text: 'c', bold: true, italic: true },
      { text: ' d', bold: true },
      { text: ' e' },
    ]);
    expect(inline('`*not italic*`')).toEqual([{ text: '*not italic*', code: true }]);
    expect(inline('2 * 3 = 6')).toEqual([{ text: '2 * 3 = 6' }]);
    expect(inline('~~gone~~')).toEqual([{ text: 'gone', strike: true }]);
  });

  test('wraps the selection in a mark, or puts a pair at the caret', () => {
    expect(wrapped('make this loud', { start: 10, end: 14 }, '**')).toEqual({
      text: 'make this **loud**',
      caret: 18,
    });
    expect(wrapped('ab', { start: 1, end: 1 }, '*')).toEqual({ text: 'a**b', caret: 2 });
  });
});

async function open() {
  const app = await render(App, {
    providers: [provideNativeRouter(routes, withComponentInputBinding())],
  });
  const notes = app.componentRef.injector.get(Notes);
  const note = notes.create();
  await app.componentRef.injector.get(NativeNavigation).push(`/notes/${note.id}`);
  await screen.findByLabelText('Title');
  return { notes, id: note.id };
}

describe('the note editor', () => {
  test('keeps the title typed into it', async () => {
    const { notes, id } = await open();
    await userEvent.type(screen.getByLabelText('Title'), 'Groceries');
    expect(notes.get(id)!.title).toBe('Groceries');
  });

  test('a shortcut makes a checklist, and return carries the list on', async () => {
    const { notes, id } = await open();
    await userEvent.type(screen.getByLabelText('Paragraph 1'), '[] milk');
    await screen.findByLabelText('Checklist 1');
    await fireEvent(screen.getByLabelText('Checklist 1'), 'submitEditing');
    await screen.findByLabelText('Checklist 2');
    expect(notes.get(id)!.blocks.map((block) => block.kind)).toEqual(['check', 'check']);
  });

  test('return in an empty list item ends the list, and backspace in an empty block removes it', async () => {
    const { notes, id } = await open();
    await userEvent.type(screen.getByLabelText('Paragraph 1'), '- one');
    await fireEvent(await screen.findByLabelText('Bullet list 1'), 'submitEditing');
    await fireEvent(await screen.findByLabelText('Bullet list 2'), 'submitEditing');
    await screen.findByLabelText('Paragraph 2');
    await fireEvent(screen.getByLabelText('Paragraph 2'), 'keyPress', { key: 'Backspace' });
    await screen.findByLabelText('Bullet list 1');
    expect(notes.get(id)!.blocks).toHaveLength(1);
  });

  test('the toolbar sets the focused block kind and bolds the selection', async () => {
    const { notes, id } = await open();
    const field = screen.getByLabelText('Paragraph 1');
    await userEvent.type(field, 'hello world');
    await fireEvent(field, 'focus');
    await fireEvent(field, 'selectionChange', { selection: { start: 6, end: 11 } });
    await userEvent.press(screen.getByRole('button', { name: 'Bold' }));
    expect(notes.get(id)!.blocks[0]!.text).toBe('hello **world**');
    await userEvent.press(screen.getByRole('button', { name: 'Heading' }));
    await screen.findByLabelText('Heading 1');
  });
});
