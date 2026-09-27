import type { WritableSignal } from '@angular/core';
import { fireEvent, render, screen, userEvent } from '@ng-native/testing';
import { expect, vi } from 'vitest';
import { check } from '../../check.ts';
import { App } from './solution/app.ts';
import { NewHabit } from './solution/new-habit.ts';

const field = () => screen.getByPlaceholderText('New habit');

/** The form's model, which the template binds; `protected`, so reached past its type. */
const modelOf = (form: NewHabit) =>
  (form as unknown as { model: WritableSignal<{ name: string }> }).model;

check(
  1,
  'The text field and the form model follow each other',
  async ({ file }) => {
    expect(file('new-habit.ts')).not.toBe('');
    const { instance, detectChanges } = await render(NewHabit);
    await userEvent.type(field(), 'Stretch');
    expect(modelOf(instance)()).toEqual({ name: 'Stretch' });
    modelOf(instance).set({ name: 'Run' });
    await detectChanges();
    expect(screen.getByDisplayValue('Run')).toBeTruthy();
  },
  'Add a file called new-habit.ts that exports NewHabit, with a <text-input placeholder="New habit" [formField]="habit.name" />. Import FormField and include it in NewHabit.imports: writing [formField] alone does not bind anything.',
);

check(
  1,
  'The screen shows the form',
  async () => {
    await render(App);
    expect(field()).toBeTruthy();
  },
  'Put <new-habit /> in the template in app.ts, and add NewHabit to its imports.',
);

check(
  2,
  'An empty name says what is wrong once the field loses focus, and not before',
  async () => {
    await render(NewHabit);
    expect(screen.queryByRole('alert')).toBeNull();
    await fireEvent.focus(field());
    await fireEvent.changeText(field(), 'a');
    await fireEvent.changeText(field(), '');
    expect(screen.queryByRole('alert')).toBeNull();
    await fireEvent.blur(field());
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Give the habit a name')).toBeTruthy();
  },
  'Add required(path.name, { message: \'Give the habit a name\' }) to the form, and show the first error in a <text accessibilityRole="alert"> while the field is touched and invalid.',
);

check(
  2,
  'The native field receives a 30-character limit',
  async () => {
    await render(NewHabit);
    expect(field().props['maxLength']).toBe(30);
  },
  'Add maxLength(path.name, 30) to the form. FormField passes it to the maxLength of the <text-input>.',
);

check(
  3,
  'Add says what was typed, and empties the field',
  async () => {
    const add = vi.fn();
    await render(NewHabit, { on: { add } });
    await userEvent.type(field(), 'Stretch');
    await userEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(add).toHaveBeenCalledWith('Stretch');
    expect(screen.queryByDisplayValue('Stretch')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  },
  'Give NewHabit add = output<string>(), and a <pressable accessibilityRole="button"> with the text Add whose (press) calls submit(this.habit, ...), emits the name and resets the form.',
);

check(
  3,
  'Add does nothing with an empty name, and says why',
  async () => {
    const add = vi.fn();
    await render(NewHabit, { on: { add } });
    await userEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(add).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
  },
  'Emit from inside submit(), which runs its action only when the form is valid.',
);

check(
  3,
  'The return key adds the habit and keeps the keyboard up',
  async () => {
    const add = vi.fn();
    await render(NewHabit, { on: { add } });
    expect(field().props['returnKeyType']).toBe('done');
    expect(field().props['submitBehavior']).toBe('submit');
    await userEvent.type(field(), 'Stretch', { submitEditing: true, skipBlur: true });
    expect(add).toHaveBeenCalledWith('Stretch');
    expect(screen.queryByDisplayValue('Stretch')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  },
  'Give the <text-input> returnKeyType="done", submitBehavior="submit" and (submitEditing)="save()".',
);

check(
  3,
  'A new habit joins the list',
  async () => {
    await render(App);
    await userEvent.type(field(), 'Stretch');
    await userEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Stretch')).toBeTruthy();
    expect(screen.getByText('3 left to do')).toBeTruthy();
  },
  'Listen with <new-habit (add)="add($event)" /> and append { id, name, done: false }, using a distinct id for every new habit.',
);

check(
  3,
  'Two habits with the same name are still two habits',
  async () => {
    await render(App);
    for (let i = 0; i < 2; i++) {
      await userEvent.type(field(), 'Stretch');
      await userEvent.press(screen.getByRole('button', { name: 'Add' }));
    }
    expect(screen.getAllByText('Stretch')).toHaveLength(2);
    expect(screen.getByText('4 left to do')).toBeTruthy();
    await userEvent.press(screen.getAllByText('Stretch')[0]!);
    expect(screen.getByText('3 left to do')).toBeTruthy();
  },
  'Give every new habit an id of its own, such as habit-1, habit-2 and so on from a counter: toggle() and track both go by id.',
);
