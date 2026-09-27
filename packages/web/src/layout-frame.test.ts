/**
 * `(layout)`'s `x`/`y`, and the coordinate space they answer in.
 *
 * `engine.ts`'s own doc comment for `measure()` says what native's `onLayout` reports: "a frame
 * in the *parent's* coordinates" - a view's offset inside whatever it is stacked in, not its
 * position on screen. `browser-engine.ts` used to report the raw viewport rect instead, which is
 * `measure()`'s frame, not `(layout)`'s - right only when the parent happened to sit at the
 * viewport's origin. Anything that reads `.y` to place content within a scrolling parent got a
 * number that was wrong wherever that parent was not pinned at y=0.
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { installJsdomEnvironment } from './jsdom-env.ts';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('a (layout) event reporting an inner view', () => {
  let frame: () => { x: number; y: number; width: number; height: number } | null;

  before(async () => {
    const document = installJsdomEnvironment().document;
    const [{ mount }, { LayoutFrameApp }] = await Promise.all([
      import('./mount.ts'),
      import('./layout-frame-app.ts'),
    ]);

    const root = document.createElement('app-root');
    document.body.appendChild(root);
    const mounted = mount(root, LayoutFrameApp);

    // jsdom lays nothing out, so both rects are stated: `outer` sits 80pt down and 50pt across a
    // page it is not at the origin of, and `inner` is a further 20pt down and 16pt across inside
    // it - the number `(layout)` should report.
    const outer = document.getElementById('outer')!;
    const inner = document.getElementById('inner')!;
    outer.getBoundingClientRect = () => ({ x: 50, y: 80, width: 300, height: 200 }) as DOMRect;
    inner.getBoundingClientRect = () => ({ x: 66, y: 100, width: 120, height: 40 }) as DOMRect;

    await settle();
    const app = mounted.componentRef.instance as InstanceType<typeof LayoutFrameApp>;
    frame = () => app.frame();
  });

  it('reports x/y relative to the immediate parent, not the viewport', () => {
    const at = frame();
    assert.ok(at, 'the layout event fired');
    assert.equal(at!.x, 16, 'inner is 16pt across inside outer, not 66pt across the viewport');
    assert.equal(at!.y, 20, 'inner is 20pt down inside outer, not 100pt down the viewport');
    assert.equal(at!.width, 120);
    assert.equal(at!.height, 40);
  });
});
