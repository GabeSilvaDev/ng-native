/**
 * A node Angular moves to another parent. Native gives a view one parent for its whole life -
 * `ShadowNodeFamily::setParent` asserts it in a debug build, and a release build goes on laying the
 * view out against the parent it had - so the engine creates a moved node again, with its subtree.
 * The fake enforces the same rule for every test, which is how two other cases were found.
 */
import assert from 'node:assert/strict';
import { afterEach, before, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Type } from '@angular/core';
import { cleanup, render, screen, settle } from '@ng-native/testing';
import { compileFixture } from './compile.ts';

afterEach(cleanup);

let mod: Record<string, unknown>;
before(async () => {
  mod = await compileFixture(fileURLToPath(new URL('./fixtures/reparent.ts', import.meta.url)));
});

it('creates projected content again when its container is mounted again', async () => {
  const { instance } = await render(
    mod['Reparent'] as Type<{ holder(): { mounts: { set(value: number[]): void } } }>,
  );
  const before = screen.getByTestId('moved').reactTag;
  // Mount the container again: the projected text now belongs to a new native parent.
  instance.holder().mounts.set([1]);
  await settle();
  const after = screen.getByTestId('moved');
  assert.notEqual(after.reactTag, before, 'a new view, not the old one under a new parent');
  assert.ok(screen.getByTestId('container').children.includes(after));
});
