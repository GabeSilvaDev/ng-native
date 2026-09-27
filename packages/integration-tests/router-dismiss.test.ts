/**
 * A presented screen that must not be swiped away while it holds unsaved changes, and has to hear
 * the attempt to ask about them. The page's host element is its screen, so it says so itself.
 */
import assert from 'node:assert/strict';
import { afterEach, before, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Type } from '@angular/core';
import type { Routes } from '@angular/router';
import { cleanup, fireEvent, render, settle, type FakeFabricNode } from '@ng-native/testing';
import { NativeNavigation } from '../router/src/native-navigation.ts';
import { provideNativeRouter } from '../router/src/provide-native-router.ts';
import { compileFixture } from './compile.ts';

afterEach(cleanup);

let mod: Record<string, unknown>;
before(async () => {
  mod = await compileFixture(
    fileURLToPath(new URL('./fixtures/guarded-sheet.ts', import.meta.url)),
  );
});

const flatten = (nodes: readonly FakeFabricNode[]): FakeFabricNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

it('refuses a swipe down while dirty, and hears it', async () => {
  const app = await render(mod['GuardShell'] as Type<unknown>, {
    providers: [provideNativeRouter(mod['guardRoutes'] as Routes)],
  });
  const nav = app.componentRef.injector.get(NativeNavigation);
  await nav.present('/editor', { as: 'formSheet' });
  await settle();
  const editor = () =>
    flatten(app.fabric.committed)
      .filter((node) => node.viewName === 'RNSScreen')
      .at(-1)!;
  const page = (mod['editors'] as Editor[]).at(-1)!;

  assert.notEqual(
    editor().props['preventNativeDismiss'],
    true,
    'a clean editor can be swiped away',
  );
  page.dirty.set(true);
  await settle();
  assert.equal(editor().props['preventNativeDismiss'], true);

  await fireEvent(editor(), 'nativeDismissCancelled', { dismissCount: 1 });
  assert.equal(page.attempts(), 1, 'the page heard the attempt');
});

interface Editor {
  dirty: { set(value: boolean): void };
  attempts(): number;
}

it('presents once for a double tap, and one back closes it', async () => {
  const app = await render(mod['GuardShell'] as Type<unknown>, {
    providers: [provideNativeRouter(mod['guardRoutes'] as Routes)],
  });
  const nav = app.componentRef.injector.get(NativeNavigation);
  const screens = () =>
    flatten(app.fabric.committed).filter((node) => node.viewName === 'RNSScreen');
  // Two taps before the first presentation has finished.
  const first = nav.present('/editor', { as: 'formSheet' });
  const second = nav.present('/editor', { as: 'formSheet' });
  await Promise.all([first, second]);
  await settle();
  assert.equal(screens().length, 2, 'the home screen and one sheet');
  nav.back();
  for (let turn = 0; turn < 5; turn++) await settle();
  assert.equal(screens().length, 1);
});
