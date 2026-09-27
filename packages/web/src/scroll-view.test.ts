/**
 * `ScrollView.scrollTo`/`scrollToEnd`, over `mount` - `browser-engine.ts`'s `scrollTo` and
 * `scrollToEnd` command handlers, which nothing else in this suite calls.
 *
 * jsdom 27 has no `Element.scrollTo` at all - not a zero-sized stub, an absent method - so this
 * file patches it onto the scroll view under test the way a real, un-smooth scroll would land: it
 * jumps straight to the requested offset and records what it was asked for. `behavior: 'smooth'`
 * itself, and whether a real browser's momentum scroll ever settles there, are not provable in
 * jsdom and need a real browser.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { installJsdomEnvironment } from './jsdom-env.ts';

async function boot() {
  const { document } = installJsdomEnvironment();
  const [{ mount }, { ScrollViewApp }] = await Promise.all([
    import('./mount.ts'),
    import('./scroll-view-app.ts'),
  ]);
  const root = document.createElement('app-root');
  document.body.appendChild(root);
  const { componentRef, applicationRef } = mount(root, ScrollViewApp);

  const scrollView = document.getElementById('content') as HTMLElement;
  Object.defineProperty(scrollView, 'scrollWidth', { value: 900, configurable: true });
  Object.defineProperty(scrollView, 'clientWidth', { value: 300, configurable: true });
  Object.defineProperty(scrollView, 'scrollHeight', { value: 20, configurable: true });
  Object.defineProperty(scrollView, 'clientHeight', { value: 20, configurable: true });

  const calls: Array<{ left?: number; top?: number; behavior?: string }> = [];
  scrollView.scrollTo = (opts: unknown) => {
    const call = opts as { left?: number; top?: number; behavior?: string };
    calls.push(call);
    if (call.left !== undefined) scrollView.scrollLeft = call.left;
    if (call.top !== undefined) scrollView.scrollTop = call.top;
  };

  const press = (id: string) => {
    document
      .getElementById(id)!
      .dispatchEvent(
        new (globalThis as any).PointerEvent('pointerdown', { pointerId: 1, bubbles: true }),
      );
    document
      .getElementById(id)!
      .dispatchEvent(
        new (globalThis as any).PointerEvent('pointerup', { pointerId: 1, bubbles: true }),
      );
    applicationRef.tick();
  };

  return { document, componentRef, applicationRef, scrollView, calls, press };
}

describe('ScrollView.scrollTo, over a real <scroll-view>', () => {
  it('dispatches a real scrollTo with the requested offset and a smooth behaviour by default', async () => {
    const { componentRef, scrollView, calls, press } = await boot();

    press('jump');

    assert.deepEqual(calls, [{ left: 300, top: 0, behavior: 'smooth' }]);
    assert.equal(scrollView.scrollLeft, 300);

    componentRef.destroy();
  });

  it('carries animated: false through as an instant behaviour', async () => {
    const { componentRef, calls, press } = await boot();

    press('jump-instant');

    assert.deepEqual(calls, [{ left: 600, top: 0, behavior: 'auto' }]);

    componentRef.destroy();
  });

  it('scrollToEnd resolves the horizontal end from scrollWidth, not a fixed axis', async () => {
    const { componentRef, calls, press } = await boot();

    press('jump-end');

    assert.deepEqual(calls, [{ left: 900, behavior: 'auto' }]);

    componentRef.destroy();
  });
});
