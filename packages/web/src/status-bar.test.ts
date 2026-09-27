/**
 * `StatusBar`, on the web: a browser tab has no status bar, so setting one does nothing - and
 * must not stop the component that set it from rendering.
 *
 * A component that asks for dark status-bar icons is ordinary on a phone, and it is exactly the
 * component the docs mount live. `statusBarSource()` guards on `typeof require === 'function'`,
 * and a browser bundle that externalises `react-native` leaves `require` defined as a stub that
 * throws, so without a browser source the guard passes, the call throws, and the component never
 * appears. The stub below is that bundle's `require`.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { installJsdomEnvironment } from './jsdom-env.ts';

describe('the status bar, on the web', () => {
  const global = globalThis as { require?: unknown };
  const original = global.require;
  let root: HTMLElement;

  before(async () => {
    const { document } = installJsdomEnvironment();
    global.require = () => {
      throw new Error('Calling `require` for "react-native" in an environment without it');
    };
    const [{ mount }, { StatusBarApp }] = await Promise.all([
      import('./mount.ts'),
      import('./status-bar-app.ts'),
    ]);
    root = document.createElement('app-root');
    document.body.appendChild(root);
    mount(root, StatusBarApp);
  });

  after(() => {
    global.require = original;
  });

  it('renders a component that sets the status bar style', () => {
    assert.match(root.textContent ?? '', /A light screen/);
  });
});
