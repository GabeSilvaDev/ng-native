/**
 * Angular's own `animate.enter` and `animate.leave`, running on native views.
 *
 * The instruction is renderer-driven rather than DOM-driven: it adds a class through `Renderer2`,
 * listens for `transitionend` through `Renderer2`, and asks the element how long its animation
 * lasts. All three are things this project can answer, so the API works unchanged - the element
 * stays in the tree, fading, until the transition the stylesheet declared has finished.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Type } from '@angular/core';
import { Engine } from '@ng-native/fabric';
import { cleanup, render, settle, type FakeFabric, type FakeFabricNode } from '@ng-native/testing';
import { compileFixture } from './compile.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits for something to become true, up to a second.
 *
 * For the end of an animation, where the alternative is sleeping for its duration plus a guess.
 * The guess is what makes a suite flaky: the duration is real time and the margin is not, so a
 * loaded machine spends the margin scheduling other work. The cap is there so a genuine
 * regression fails rather than hangs.
 */
const until = async (done: () => boolean) => {
  for (let attempt = 0; attempt < 100 && !done(); attempt++) await wait(10);
};
const flatten = (n: FakeFabricNode[]): FakeFabricNode[] =>
  n.flatMap((x) => [x, ...flatten(x.children)]);

let mod: Record<string, unknown>;
before(async () => {
  mod = await compileFixture(fileURLToPath(new URL('./fixtures/leave.ts', import.meta.url)));
});

after(cleanup);

describe('animate.leave', () => {
  let fabric: FakeFabric;
  let host: { shown: { set(v: boolean): void } };

  const panel = () => flatten(fabric.committed).find((n) => n.props['opacity'] !== undefined);

  async function boot() {
    const result = await render(mod['Leaving'] as Type<{ shown: { set(v: boolean): void } }>);
    fabric = result.fabric;
    host = result.instance;
  }

  it('is switched on at all, which needs the animation globals in place', async () => {
    await boot();
    assert.ok(panel(), 'the panel is on screen to begin with');
    assert.equal(panel()!.props['opacity'], 1);
  });

  it('keeps the element while it fades, and removes it when the transition ends', async () => {
    await boot();
    host.shown.set(false);
    await settle();

    assert.ok(panel(), 'still there: the leave class only started a transition');
    assert.equal(panel()!.props['opacity'], 1, 'and it has not jumped to the end');

    /*
     * Waited out rather than slept through.
     *
     * This was `wait(420)` for a 300ms transition, which is a comfortable-looking margin and is
     * not one: a hundred test files run at once, and a machine busy enough will not get round to
     * the timer that ends the transition inside the spare 120ms. It failed roughly one full run
     * in ten, and a red that only appears in a full run reads as a bug in whatever changed last.
     */
    await until(() => panel() === undefined);
    assert.equal(panel(), undefined, 'gone once the transition finished');
  });

  it('reaches an opacity between the two along the way', async () => {
    await boot();
    host.shown.set(false);
    await settle();
    await wait(150);

    const opacity = panel()?.props['opacity'];
    assert.ok(typeof opacity === 'number', 'still rendering while it leaves');
    assert.ok(opacity > 0 && opacity < 1, `mid-fade, got ${opacity}`);
  });
});

/**
 * `animate.enter`, on a `@keyframes` animation, which is what it is designed for.
 *
 * Angular adds the enter classes from a queue that runs after the render pass, so the element has
 * already been committed once in its resting style. A transition cannot survive that - it would
 * animate to the entering style and back - but an animation plays from its own frames regardless
 * of what came before, so the ordering stops mattering.
 */
describe('animate.enter', () => {
  it('plays the keyframes and holds the element until they finish', async () => {
    const { fabric, instance, componentRef } = await render(
      mod['Entering'] as Type<{ shown: { set(v: boolean): void } }>,
    );

    instance.shown.set(true);
    await settle();
    const opacity = () =>
      flatten(fabric.committed).find((n) => n.props['opacity'] !== undefined)?.props['opacity'];

    await wait(60);
    const early = opacity() as number;
    assert.ok(early < 1, `playing from the first frame, got ${early}`);

    await until(() => opacity() === 1);
    assert.equal(opacity(), 1, 'and settles on its resting style');

    const node = componentRef.injector.get(Engine).root.children[0]!;
    assert.equal(node.classes?.has('arriving'), false, 'with the enter class taken off again');
    cleanup();
  });
});
