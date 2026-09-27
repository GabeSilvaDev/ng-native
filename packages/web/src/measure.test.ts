/**
 * `measure`, and the coordinate space it answers in.
 *
 * `measureInWindow` on native answers in window coordinates, and the overlay host is a full-screen
 * absolutely positioned view at the window's origin - so an anchored overlay can use one as the
 * other. `getBoundingClientRect` answers in viewport coordinates, and `<overlay-host>` sits
 * inside the mount root, so those agree only when the root is at the top left of an unscrolled
 * viewport.
 *
 * That is true of a full-page app, which is why every popover in the gallery lands correctly and
 * why this went unnoticed for as long as it did. It is false the moment an app is mounted into a
 * box partway down a page - which is what a documentation site does with a live example, and
 * where every overlay came out offset by the box's own position.
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { installJsdomEnvironment } from './jsdom-env.ts';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('measuring a node for an anchored overlay', () => {
  let document: Document;
  let engine: { measure(node: unknown, into: (f: { x: number; y: number }) => void): void };
  let node: unknown;

  before(async () => {
    document = installJsdomEnvironment().document;
    const [{ mount }, { ButtonApp }, { nodeOf }] = await Promise.all([
      import('./mount.ts'),
      import('./button-app.ts'),
      import('./dom-node.ts'),
    ]);

    // A root that is not at the viewport origin, which is the case under test.
    const root = document.createElement('app-root');
    document.body.appendChild(root);
    const mounted = mount(root, ButtonApp);
    engine = mounted.engine as unknown as typeof engine;
    await settle();

    const button = document.querySelector('#trigger')!;
    node = nodeOf(button);

    // jsdom lays nothing out, so both rects are stated rather than measured: a root offset 120pt
    // down the page, and a button 40pt below the root's own top.
    (root as Element).getBoundingClientRect = () =>
      ({ x: 0, y: 120, width: 400, height: 300 }) as DOMRect;
    (button as Element).getBoundingClientRect = () =>
      ({ x: 16, y: 160, width: 200, height: 36 }) as DOMRect;
  });

  it('answers relative to the mount root, not the viewport', () => {
    /*
     * The button is at viewport y=160 and the root starts at y=120, so the overlay host - which
     * is positioned inside that root - needs to hear 40, not 160. Told 160 it would place a
     * popover 120pt too far down, which is exactly the root's own offset.
     */
    const frames: { x: number; y: number }[] = [];
    engine.measure(node, (f) => frames.push(f));
    assert.equal(frames.length, 1, 'measure answered');
    assert.equal(frames[0]!.y, 40, 'the offset of the button within the root');
    assert.equal(frames[0]!.x, 16, 'and the root starts at x=0, so x is unchanged');
  });
});

describe('measuring a node when more than one root is mounted on the page', () => {
  let engine: { measure(node: unknown, into: (f: { x: number; y: number }) => void): void };
  let node: unknown;

  before(async () => {
    const document = installJsdomEnvironment().document;
    const [{ mount }, { ButtonApp }, { nodeOf }] = await Promise.all([
      import('./mount.ts'),
      import('./button-app.ts'),
      import('./dom-node.ts'),
    ]);

    // The documentation site's own home page mounts three of these side by side - `querySelector`
    // answers the first one in document order regardless of which one `node` is actually in, so a
    // node in the second root would be measured against the first root's box.
    const firstRoot = document.createElement('app-root');
    document.body.appendChild(firstRoot);
    mount(firstRoot, ButtonApp);
    await settle();
    (firstRoot as Element).getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 400, height: 100 }) as DOMRect;

    const secondRoot = document.createElement('app-root');
    document.body.appendChild(secondRoot);
    const mounted = mount(secondRoot, ButtonApp);
    engine = mounted.engine as unknown as typeof engine;
    await settle();

    (secondRoot as Element).getBoundingClientRect = () =>
      ({ x: 0, y: 500, width: 400, height: 300 }) as DOMRect;
    // Not `#trigger`: both roots use the same fixture, so the id is duplicated across the
    // document, and jsdom's `#id` selector fast path answers from the whole document rather than
    // scoping to `secondRoot` - a jsdom quirk, not something either root actually does. The
    // element name is unambiguous once scoped to this root's own subtree.
    const button = secondRoot.querySelector('pressable')!;
    node = nodeOf(button);
    (button as Element).getBoundingClientRect = () =>
      ({ x: 16, y: 540, width: 200, height: 36 }) as DOMRect;
  });

  it('answers relative to its own root, not the first root in the document', () => {
    const frames: { x: number; y: number }[] = [];
    engine.measure(node, (f) => frames.push(f));
    assert.equal(frames.length, 1, 'measure answered');
    // Against the first root (y=0) this would answer 540; against its own (y=500) it is 40.
    assert.equal(frames[0]!.y, 40, 'the offset of the button within its own root');
  });
});
