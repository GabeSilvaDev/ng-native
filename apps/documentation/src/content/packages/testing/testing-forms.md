---
title: Testing a form
summary: Typing into a field, touched state, and a field a form has disabled.
---

# Testing a form

Continues from [Writing a test](/packages/testing/writing-a-test). A Signal Forms sign-up form: a
required email field, an error that appears once the field has been touched, a checkbox that
disables the field, and a button that stays disabled while the form is invalid.

```ts
import { Component, signal } from '@angular/core';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { Pressable, Text, TextInput, View } from '@ng-native/components';
import { render, screen, userEvent, within } from '@ng-native/testing';
import { expect, it } from 'vitest';

@Component({
  selector: 'app-sign-up',
  imports: [FormField, Pressable, Text, TextInput, View],
  template: `
    <view>
      <text-input
        accessibilityLabel="Email"
        placeholder="you@example.com"
        [formField]="signUp.email"
      />
      @if (signUp.email().touched() && signUp.email().invalid()) {
        <text accessibilityRole="alert">Email is required</text>
      }
      <pressable
        accessibilityRole="checkbox"
        accessibilityLabel="Busy"
        [accessibilityState]="{ checked: busy() }"
        (press)="busy.set(!busy())"
      >
        <text>Busy</text>
      </pressable>
      <pressable
        accessibilityRole="button"
        [disabled]="signUp().invalid()"
        (press)="submitted.set(model().email)"
      >
        <text>Sign up</text>
      </pressable>
      @if (submitted()) {
        <text>Welcome, {{ submitted() }}</text>
      }
    </view>
  `,
})
class SignUp {
  protected readonly busy = signal(false);
  protected readonly model = signal({ email: '' });
  protected readonly submitted = signal('');
  protected readonly signUp = form(this.model, (path) => {
    required(path.email);
    disabled(path.email, () => this.busy());
  });
}

it('types, then presses', async () => {
  const user = userEvent.setup();
  await render(SignUp);

  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.press(screen.getByRole('button', { name: 'Sign up' }));

  expect(screen.getByText('Welcome, ada@example.com')).toBeTruthy();
  expect(screen.getByDisplayValue('ada@example.com')).toBeTruthy();
});
```

`getByLabelText` finds the field by its `accessibilityLabel`, and `getByDisplayValue` finds a field
by what is in it. `user.type` focuses the field, sends one native change per character, and blurs
it at the end, as the keyboard would. The blur is what Signal Forms marks a field touched from, so
typing and then clearing the field is enough to show the error:

```ts
it('says a field is required once it has been touched', async () => {
  const user = userEvent.setup();
  await render(SignUp);
  expect(screen.queryByRole('alert')).toBeNull();

  await user.type(screen.getByPlaceholderText('you@example.com'), 'a');
  await user.clear(screen.getByPlaceholderText('you@example.com'));

  expect(within(screen.getByRole('alert')).getByText('Email is required')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Sign up' }).props['accessibilityState']).toEqual({
    disabled: true,
  });
});
```

`queryBy*` returns `null` where `getBy*` would throw, which is how to assert that something is not
there. `within(node)` scopes queries to one node and what is under it. And a node's `props` are
what native receives: a disabled button is one whose `accessibilityState` says so, which is also
what a screen reader announces.

When the form disables the field, the native field stops taking input, and a user typing into it
changes nothing:

```ts
it('stops the field taking input while the form disables it', async () => {
  const user = userEvent.setup();
  await render(SignUp);

  await user.press(screen.getByRole('checkbox', { name: 'Busy' }));

  expect(screen.getByLabelText('Email').props['editable']).toBe(false);
  await user.type(screen.getByLabelText('Email'), 'ignored');
  expect(screen.queryByDisplayValue('ignored')).toBeNull();
});
```

See [Build a form](/guide/forms) for the model this is testing, including submission.
