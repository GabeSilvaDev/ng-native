import { provideNativeRouter } from '@ng-native/router';
import { fireEvent, render, screen, userEvent, waitFor } from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { KeyboardLab } from './keyboard-lab.ts';
import { NoteDrafts } from './note-drafts.ts';
import { NoteSheet } from './note-sheet.ts';

describe('keyboard lab', () => {
  test('saves the sheet s note for the page that opened it, and only with a title', async () => {
    const { componentRef } = await render(NoteSheet, { providers: [provideNativeRouter([])] });
    const drafts = componentRef.injector.get(NoteDrafts);
    await userEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Give the note a title')).toBeTruthy());
    expect(drafts.saved()).toBeNull();
    await userEvent.type(screen.getByLabelText('Title'), 'Groceries');
    await userEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(drafts.saved()).toBe('Groceries'));
  });

  test('moves from the email field to the amount with the Next key', async () => {
    const { fabric } = await render(KeyboardLab, { providers: [provideNativeRouter([])] });
    await fireEvent(screen.getByLabelText('Email'), 'submitEditing', { text: '' });
    const focused = fabric.commands.filter((command) => command.name === 'focus');
    expect(focused.map((command) => command.node?.props['accessibilityLabel'])).toEqual(['Amount']);
  });
});
