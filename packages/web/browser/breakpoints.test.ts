/**
 * Responsiveness, at a real viewport width - the CSS way, which jsdom cannot reach at all.
 *
 * Tailwind's own `md:` is a real media query, which needs a stylesheet and a viewport with a
 * width. `packages/ui`'s (deleted) `Sidebar` used to give this suite a second, TypeScript way to
 * prove the same kind of thing - `Screen.compact()`, which reads `window.innerWidth` through
 * `device-sources.ts` and is what a component branches its *template* on - but that component is
 * gone with the rest of `packages/ui`, and nothing left in this package branches a template on
 * `Screen.compact()`. `src/device-sources.test.ts` still covers `Screen` following a resize at
 * the signal level, which is the seam a future component branching on it would need proving at
 * this level too.
 */
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { boot, settle, waitFor } from './boot.ts';
import { BreakpointsApp } from '../src/breakpoints-app.ts';

describe('viewport width', () => {
  it('flips a `md:` media query when the window crosses the breakpoint', async () => {
    // `breakpoints-app.ts` lays its row out `flex-col md:flex-row`, so it stacks on a phone and
    // shares the line on an iPad. `md` is 48rem, so 700px is below it and 900px above.
    await page.viewport(700, 800);
    const { byId } = boot(BreakpointsApp);
    await settle();

    const row = byId('layout').querySelector('[class*="md:flex-row"]') as HTMLElement;
    expect(row).toBeTruthy();
    expect(getComputedStyle(row).flexDirection).toBe('column');

    await page.viewport(900, 800);
    await waitFor(
      () => getComputedStyle(row).flexDirection === 'row',
      'the md: breakpoint to take effect',
    );
  });
});
