/**
 * The node:test sample on the "Setup" docs page, run as written. The page quotes this file.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Component, signal } from '@angular/core';
import { Pressable, Text } from '@ng-native/components';
import { render, screen, userEvent } from '@ng-native/testing';

@Component({
  selector: 'app-counter',
  imports: [Pressable, Text],
  template: `
    <pressable accessibilityRole="button" (press)="count.set(count() + 1)">
      <text>Count {{ count() }}</text>
    </pressable>
  `,
})
class Counter {
  protected readonly count = signal(0);
}

test('counts a press', async () => {
  await render(Counter);

  await userEvent.press(screen.getByRole('button', { name: 'Count 0' }));

  assert.ok(screen.getByText('Count 1'));
});
