/**
 * What colour a header bar is when nothing said.
 *
 * A native header is configured with props, and a prop cannot read the cascade - so the bar has no
 * way to resolve `--background` the way a view does with a class. Left unset, each platform picks
 * for itself: iOS follows the system appearance and looks broadly right, and Android falls back to
 * the app theme's `colorPrimary`, which is the framework's default blue on every screen of every
 * app built here.
 *
 * So the values are written out, one pair per colour scheme, and `NativeHeader` uses them for any
 * colour prop the call site did not bind. They are shadcn's neutral `--background` and
 * `--foreground`, a common default for a screen's own palette, so a bar matches the screen under
 * it more often than not. The cost is that an app with a different palette has to say so here
 * too.
 *
 * That is what the token is for. Provide it once and every header follows:
 *
 * ```ts
 * providers: [
 *   {
 *     provide: NATIVE_HEADER_PALETTE,
 *     useValue: {
 *       light: { background: '#ffffff', foreground: '#0a0a0a' },
 *       dark: { background: '#0a0a0a', foreground: '#fafafa' },
 *     },
 *   },
 * ]
 * ```
 */
import { InjectionToken } from '@angular/core';
import type { Scheme } from '@ng-native/device';

export interface HeaderColors {
  /** The bar itself. */
  readonly background: string;
  /** The title, the back button and anything else the platform tints. */
  readonly foreground: string;
}

/**
 * shadcn's neutral palette, as the two colours a header needs.
 *
 * `oklch(1 0 0)` and `oklch(0.145 0 0)` in light, `oklch(0.145 0 0)` and `oklch(0.985 0 0)` in
 * dark, lowered to the sRGB the build produces from them.
 */
export const DEFAULT_HEADER_PALETTE: Record<Scheme, HeaderColors> = {
  light: { background: 'rgb(255, 255, 255)', foreground: 'rgb(10, 10, 10)' },
  dark: { background: 'rgb(10, 10, 10)', foreground: 'rgb(250, 250, 250)' },
};

export const NATIVE_HEADER_PALETTE = new InjectionToken<Record<Scheme, HeaderColors>>(
  'angular-native.nativeHeaderPalette',
  { factory: () => DEFAULT_HEADER_PALETTE },
);
