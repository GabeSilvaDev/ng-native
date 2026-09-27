/**
 * The safe area as a tab screen sees it: react-native-screens' own view, which asks the screen it
 * is in for its insets, and so knows how much of the bottom edge the tab bar covers.
 *
 * Native takes the edges as four booleans on every commit, so a partial record would leave the
 * edges it omits at whatever they were.
 */
import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Type } from '@angular/core';
import { registerScreenComponents } from '../router/src/screens.ts';
import { cleanup, render, screen, type RenderResult } from '@ng-native/testing';
import { compileFixture } from './compile.ts';

describe('the tab safe area', () => {
  let mod: Record<string, unknown>;
  let app: RenderResult<{ edges: { set(value: readonly ('top' | 'bottom')[]): void } }>;

  before(async () => {
    registerScreenComponents();
    mod = await compileFixture(
      fileURLToPath(new URL('./fixtures/tab-safe-area.ts', import.meta.url)),
    );
  });

  beforeEach(async () => {
    app = await render(mod['TabSafeAreaHost'] as Type<typeof app.instance>);
  });

  afterEach(() => cleanup());

  it('commits the screens library view, not the safe-area-context one', () => {
    // RNCSafeAreaView reads the root provider, which sits above the tab bar and never hears of it.
    assert.equal(screen.getByTestId('all').viewName, 'RNSSafeAreaView');
  });

  it('insets every edge when the caller names none', () => {
    assert.deepEqual(screen.getByTestId('all').props['edges'], {
      top: true,
      right: true,
      bottom: true,
      left: true,
    });
  });

  it('turns a list of edges into all four, with the rest off', () => {
    assert.deepEqual(screen.getByTestId('some').props['edges'], {
      top: false,
      right: false,
      bottom: true,
      left: false,
    });
  });

  it('sends all four edges again when the caller changes one', async () => {
    app.instance.edges.set(['top']);
    await app.detectChanges();

    assert.deepEqual(screen.getByTestId('some').props['edges'], {
      top: true,
      right: false,
      bottom: false,
      left: false,
    });
  });

  it('takes its own padding from the stylesheet, which native adds the inset to as margin', () => {
    const content = screen.getByTestId('some');
    assert.equal(content.props['paddingBottom'], 16);
    assert.equal(content.props['marginBottom'], undefined, 'the margin is native to set');
  });
});
