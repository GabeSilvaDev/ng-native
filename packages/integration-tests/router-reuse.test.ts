/**
 * The reuse strategy. Without it the router never detaches, so navigating away destroys the
 * screen and coming back rebuilds it from scratch.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';
import { NativeStackReuseStrategy } from '../router/src/native-stack-reuse-strategy.ts';
import { markScreenRoute } from '../router/src/tab-routes.ts';

/** Enough of a snapshot for the strategy: its url segments, children and component. */
function snapshot(
  url: string,
  options: { children?: unknown[]; component?: unknown; parent?: unknown } = {},
): ActivatedRouteSnapshot {
  return {
    url: url
      ? url
          .split('/')
          .filter(Boolean)
          .map((s) => ({ toString: () => s }))
      : [],
    children: options.children ?? [],
    component: options.component === undefined ? class {} : options.component,
    parent: options.parent ?? null,
  } as unknown as ActivatedRouteSnapshot;
}

const handle = (name: string) => ({ name }) as unknown as DetachedRouteHandle;

describe('native stack reuse strategy', () => {
  let strategy: NativeStackReuseStrategy;

  beforeEach(() => {
    strategy = new NativeStackReuseStrategy();
  });

  it('keeps apart two routes whose segments join to the same text', () => {
    // One segment holding a slash and two segments either side of one: the same url, different
    // routes, so neither may be handed the other's screen.
    const one = snapshot('');
    Object.assign(one, { url: [{ toString: () => 'a/b' }] });
    const two = snapshot('b', { parent: snapshot('a') });
    strategy.store(one, handle('one'));
    assert.equal(strategy.retrieve(two), null);
  });

  it('detaches leaf routes so their screens survive being pushed away', () => {
    assert.equal(strategy.shouldDetach(snapshot('users/1')), true);
  });

  it('does not detach a route that is only layout', () => {
    // A parent with children is a shell, not a destination, and has no screen of its own.
    assert.equal(strategy.shouldDetach(snapshot('users', { children: [snapshot('1')] })), false);
    assert.equal(strategy.shouldDetach(snapshot('users/1', { component: null })), false);
  });

  it('detaches a parent that a stack put on screen, so a sheet over it leaves it standing', () => {
    // A root stack whose first screen is the tab bar: presenting a top-level sheet over it
    // navigates away from that route, which has children. Destroying it would take the tabs,
    // and the sheet would be the only screen in the stack, shown full screen.
    const config = { path: '' };
    markScreenRoute(config);
    const tabs = Object.assign(snapshot('', { children: [snapshot('properties')] }), {
      routeConfig: config,
    });
    assert.equal(strategy.shouldDetach(tabs), true);
  });

  it('keys stored screens by resolved url, not by route config', () => {
    // /users/1 and /users/2 share a config but are two separate screens on the stack.
    const one = snapshot('users/1');
    const two = snapshot('users/2');

    strategy.store(one, handle('one'));

    assert.equal(strategy.shouldAttach(one), true);
    assert.equal(strategy.shouldAttach(two), false, 'a different param is a different screen');
    assert.deepEqual(strategy.retrieve(one), handle('one'));
    assert.equal(strategy.retrieve(two), null);
  });

  it('includes parent segments in the key', () => {
    const parent = snapshot('users');
    const child = snapshot('1', { parent });
    strategy.store(child, handle('nested'));

    assert.equal(strategy.shouldAttach(child), true);
    assert.equal(strategy.shouldAttach(snapshot('1')), false, 'same leaf, different parent');
  });

  it('keeps a tab apart from the empty-path screen at the root of its stack', () => {
    // /tabs/library is the tab; its list is path '' beneath it, so both resolve to the same url.
    // Sharing a key, the router asks for the list, is handed the tab's own tree, and makes the
    // tab its own child: the next setRouterState walks that loop until the stack runs out.
    const shell = snapshot('tabs');
    const tab = snapshot('library', { parent: shell, children: [snapshot('')] });
    const list = snapshot('', { parent: tab });

    strategy.store(tab, handle('tab'));

    assert.equal(strategy.shouldAttach(list), false, 'the list is not the tab');
    assert.equal(strategy.retrieve(list), null);
    assert.deepEqual(strategy.retrieve(tab), handle('tab'));
  });

  it('forgets a screen when the router stores a null handle', () => {
    const route = snapshot('users/1');
    strategy.store(route, handle('one'));
    strategy.store(route, null);

    assert.equal(strategy.shouldAttach(route), false);
    assert.equal(strategy.retrieve(route), null);
  });
});

describe('a stored screen whose component is gone', () => {
  it('is never offered back to the router', () => {
    const strategy = new NativeStackReuseStrategy();
    const route = snapshot('/a');
    const handle = { componentRef: { hostView: { destroyed: false }, onDestroy() {} } };
    strategy.store(route, handle as never);
    assert.equal(strategy.shouldAttach(route), true);

    // The outlet popped past it and destroyed the component; the router was never told.
    handle.componentRef.hostView.destroyed = true;
    assert.equal(strategy.shouldAttach(route), false);
    assert.equal(strategy.retrieve(route), null);
  });
});
