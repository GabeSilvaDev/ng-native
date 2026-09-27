/**
 * Plain DOM event bindings, which did not work at all.
 *
 * `renderer.listen('click', fn)` put the callback in the node's listener map and stopped. That
 * map is only read by `dispatchEvent`, and nothing ever dispatches a `topClick` - so the binding
 * registered successfully, fired never, and reported nothing. Every `(click)`, `(keydown)` and
 * `(input)` in an app was dead, Angular's own `RouterLink` among them, which is why no link in
 * the gallery navigated.
 *
 * The three cases here are the three things that were wrong: it has to fire at all, the handler
 * has to get a real DOM event rather than React Native's `{ nativeEvent }` wrapper, and it has to
 * bubble exactly once rather than twice.
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { installJsdomEnvironment } from './jsdom-env.ts';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('plain DOM event bindings', () => {
  let host: {
    navigations: () => number;
    defaultPrevented: () => boolean;
    outerClicks: () => number;
    keys: () => number;
  };
  let document: Document;

  before(async () => {
    document = installJsdomEnvironment().document;
    const [{ mount }, { DomEventsApp }] = await Promise.all([
      import('./mount.ts'),
      import('./dom-events-app.ts'),
    ]);
    const root = document.createElement('app-root');
    document.body.appendChild(root);
    host = mount(root, DomEventsApp).componentRef.instance as typeof host;
    await settle();
  });

  // `nativeID` commits as a real `id` on the web (`props.ts`), which is the point of it.
  const node = (id: string) => document.getElementById(id) as HTMLElement;

  /*
   * Events are built from the document's own window, not from `globalThis`.
   *
   * `installJsdomEnvironment` puts on `globalThis` only what Angular's module-level code needs to
   * see, and the event constructors are not part of that. An event built in a different realm
   * from the element it is dispatched on would be the wrong class anyway.
   */
  const view = () => document.defaultView as unknown as Window & typeof globalThis;
  const click = (id: string) =>
    node(id).dispatchEvent(new (view().MouseEvent)('click', { bubbles: true, cancelable: true }));

  it('fires a click binding at all', async () => {
    click('link');
    await settle();
    assert.equal(host.navigations(), 1);
  });

  it('hands the handler a real DOM event, not a wrapped one', async () => {
    // `RouterLink` reads `button`, `ctrlKey` and `metaKey` straight off the event and calls
    // `preventDefault` on it. A `{ nativeEvent }` wrapper has none of those, so this is the
    // difference between a link that navigates and one that throws.
    assert.equal(host.defaultPrevented(), true, 'preventDefault reached the real event');
  });

  it('bubbles from a child exactly once', async () => {
    /*
     * The DOM bubbles a click on the inner view up to the outer one by itself. This package also
     * walks its own retained tree in `propagate`, to emulate the bubbling React Native does in
     * JavaScript - so running both would call the outer handler twice for one click.
     */
    click('inner');
    await settle();
    assert.equal(host.outerClicks(), 1, 'once, not twice');
  });

  it('binds an event that is not a click, by lowercasing the name', async () => {
    // `topKeyDown` has to reach `keydown`. Nothing about the fix is click-specific.
    node('field').dispatchEvent(new (view().KeyboardEvent)('keydown', { bubbles: true }));
    await settle();
    assert.equal(host.keys(), 1);
  });
});
