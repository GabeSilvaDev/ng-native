/**
 * A bar under a parameter, `city/:name`: each tab's url is the parameter's segment as the router
 * writes it, escaped and with its matrix parameters, so a url inside a tab is found in it.
 */
import assert from 'node:assert/strict';
import { afterEach, before, describe, it } from 'node:test';
import type { Type } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import { cleanup, fireEvent, render, settle, type FakeFabricNode } from '@ng-native/testing';
import { provideNativeRouter } from '../router/src/provide-native-router.ts';
import { compileFixture } from './compile.ts';

function flatten(nodes: FakeFabricNode[]): FakeFabricNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

async function idle(): Promise<void> {
  for (let turn = 0; turn < 5; turn++) await settle();
}

describe('a bar under a parameter', () => {
  let mod: Record<string, unknown>;

  before(async () => {
    mod = await compileFixture('fixtures/tab-param-parent.ts');
  });

  afterEach(() => cleanup());

  async function cityAt(url: string) {
    const app = await render(mod['Shell'] as Type<unknown>, {
      providers: [provideNativeRouter(mod['routes'] as Routes)],
    });
    const router = app.componentRef.injector.get(Router);
    await router.navigateByUrl(url);
    await idle();
    let provenance = 0;
    const host = () =>
      flatten(app.fabric.committed).find((node) => node.viewName === 'RNSTabsHostIOS')!;
    const tap = async (key: string) => {
      await fireEvent(host(), 'tabSelected', { selectedScreenKey: key, provenance: ++provenance });
      await idle();
    };
    return { router, tap };
  }

  for (const name of ['rio', 'são-paulo', 'new york']) {
    it(`returns a tab to the page it was on, in a city written ${JSON.stringify(name)}`, async () => {
      const { router, tap } = await cityAt(`/city/${encodeURIComponent(name)}/library/7`);
      const at = router.url;
      await tap('home');
      assert.equal(router.url, `/city/${encodeURIComponent(name)}/home`);
      await tap('library');
      assert.equal(router.url, at, 'back on the album, not on the tab root');
    });
  }

  it('keeps the matrix parameters of the parameter it is under', async () => {
    const { router, tap } = await cityAt('/city/rio;lang=pt/home');
    await tap('library');
    assert.equal(router.url, '/city/rio;lang=pt/library');
    await tap('home');
    assert.equal(router.url, '/city/rio;lang=pt/home');
  });
});
