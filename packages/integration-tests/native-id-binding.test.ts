/**
 * Binding `[nativeID]` on a component that composes a press behaviour.
 *
 * A property that no directive on the node claims is applied as a plain write on the host
 * element. `ViewBase.ngOnChanges` then rewrote some forty props from its own inputs, and for an
 * input the composing component never exposed that value is `undefined` - so the plain write
 * survived exactly until the first time any other input changed, and then vanished.
 *
 * Two things reach a node by that route, and both were one input change from breaking:
 *
 * - `[nativeID]` on a component whose `hostDirectives` entry lists `disabled` and not the
 *   identity inputs, which is `ui-select-item` and `ui-dropdown-menu-item`.
 * - A host binding on the composing component, which is how `ui-alert` sets `[accessible]` and
 *   `ui-separator` sets `[accessibilityLabel]`. Both are documented as working and both were
 *   passing their own tests, because nothing in those tests changed an input afterwards.
 *
 * `ViewBase` no longer writes a prop it has nothing to say about. This holds that.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Type } from '@angular/core';
import { cleanup, render, screen, settle } from '@ng-native/testing';
import type { FakeFabric, FakeFabricNode } from '@ng-native/testing';
import { compileFixture } from './compile.ts';

const flatten = (n: FakeFabricNode[]): FakeFabricNode[] =>
  n.flatMap((x) => [x, ...flatten(x.children)]);

describe('a prop written by a route that is not an input of ViewBase', () => {
  let fabric: FakeFabric;
  let host: { off: { set(v: boolean): void } };

  before(async () => {
    const mod = await compileFixture(
      fileURLToPath(new URL('./fixtures/native-id-binding.ts', import.meta.url)),
    );
    const rendered = await render(mod['NativeIdHost'] as Type<unknown>);
    fabric = rendered.fabric;
    host = rendered.instance as typeof host;
  });

  after(cleanup);

  // Bulk "every id present" read: the query matrix has no query for that, so this keeps a local
  // `flatten` over the whole committed tree for it.
  const ids = () =>
    flatten(fabric.committed)
      .map((n) => n.props['nativeID'])
      .filter((id) => id !== undefined);

  it('keeps a host binding the composing component made, past an input change', async () => {
    // The alert and separator pattern. The label is written by a host binding on the component,
    // and `ViewBase` has no `accessibilityLabel` input of its own here - so before the fix it
    // wrote undefined over it the moment `disabled` changed.
    const labelled = () => screen.getByTestId('host-bound');
    assert.equal(labelled().props['accessibilityLabel'], 'Close');

    host.off.set(true);
    await settle();
    assert.equal(labelled().props['accessibilityLabel'], 'Close', 'and it is still there');
    assert.equal(labelled().props['nativeID'], 'host-bound');
  });

  it('arrives however it was written, and whatever the host directive lists', () => {
    assert.deepEqual(ids().sort(), [
      'host-bound',
      'loop-one',
      'loop-two',
      'narrow-both',
      'narrow-bound',
      'narrow-static',
      'wide-bound',
      'wide-static',
    ]);
  });
});
