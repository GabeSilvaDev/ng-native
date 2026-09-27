/**
 * A node a query returns ends up in an assertion's failure message. It has to print as the view it
 * is: the engine's own objects behind it reach the whole application, and printing those turned a
 * failed `assert.equal(node, null)` into a forty-second hang.
 */
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { inspect } from 'node:util';
import { Component } from '@angular/core';
import { Text, View } from '@ng-native/components';
import { cleanup, render, screen } from '@ng-native/testing';

afterEach(cleanup);

@Component({
  selector: 'x-printed',
  imports: [Text, View],
  template: `<view testID="box"><text>Visible</text></view>`,
})
class Printed {}

test('a node prints as its view, its props and its children', async () => {
  await render(Printed);
  const node = screen.getByTestId('box');
  const printed = inspect(node, { depth: Infinity });
  assert.ok(printed.length < 2000, `printed ${printed.length} characters`);
  assert.match(printed, /Visible/);
  assert.ok(node.instanceHandle, 'the handle is still there for events to use');
});

test('a clone keeps the handle', async () => {
  await render(Printed);
  const before = screen.getByTestId('box');
  // A later commit clones; the clone must still route events to the same element.
  assert.ok(before.children[0]!.instanceHandle);
});
