/**
 * `Screen.window`, which promises "what the app can draw in" and on Android 15 did not deliver it.
 *
 * An Expo app draws edge to edge on Android 15, painting behind the status and navigation bars.
 * `Dimensions.get('window')` does not know that: it reports the area between the bars, which on a
 * 1080x2400 phone was 838.5pt against an actual drawable height of 914.3. Everything downstream of
 * that number was short by the 75.8pt of system bars - viewport units, height media queries, and
 * any layout that sized itself from `window`.
 *
 * The safe-area provider measures the frame it is actually given, which is the drawable area by
 * definition and on both platforms. So `window` prefers it and falls back to `Dimensions` for the
 * one frame before the provider has reported.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SafeArea, Screen } from '@ng-native/device';
import { servicesWith } from './injected.ts';

/**
 * A `Screen` and the `SafeArea` it reads, sharing one injector.
 *
 * `SafeArea` is provided by value rather than resolved, so both the service under test and the
 * test itself hold the same instance and `report()` reaches the signal `Screen.window` reads.
 */
function boot(window: { width: number; height: number }) {
  const safeArea = new SafeArea();
  const screen = servicesWith(
    [
      [
        Screen.SOURCE,
        {
          current: () => ({ window, screen: { width: window.width, height: 914.3 } }),
          subscribe: () => () => {},
        },
      ],
      [SafeArea, safeArea],
    ],
    () => new Screen(),
  );
  return { screen, safeArea };
}

describe('the area the app can draw in', () => {
  it('falls back to Dimensions before the provider has measured', () => {
    // `SafeArea.frame` is null until the provider lays out, which is one frame after mount. A
    // window of zero in that frame would be worse than a slightly wrong one.
    const { screen } = boot({ width: 411, height: 838.5 });
    assert.equal(screen.window().height, 838.5);
  });

  it('takes the measured frame once there is one', () => {
    const { screen, safeArea } = boot({ width: 411, height: 838.5 });
    safeArea.report(
      { top: 51.8, right: 0, bottom: 24, left: 0 },
      { x: 0, y: 0, width: 411, height: 914.3 },
    );
    assert.equal(
      screen.window().height,
      914.3,
      'the drawable frame, not the space between the system bars',
    );
  });

  it('keeps compact deciding on the measured width', () => {
    // The breakpoint has to follow the same number, or a tablet in a narrow window disagrees with
    // itself about which layout it is.
    const { screen, safeArea } = boot({ width: 411, height: 838.5 });
    safeArea.report(
      { top: 0, right: 0, bottom: 0, left: 0 },
      { x: 0, y: 0, width: 900, height: 914.3 },
    );
    assert.equal(screen.compact(), false);
  });
});
