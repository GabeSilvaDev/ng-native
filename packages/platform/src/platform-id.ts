/**
 * What `PLATFORM_ID` says on a device, and the check that asks it.
 *
 * Angular's own values are `'browser'` and `'server'`, and its default when nothing provides one
 * is `'unknown'`, which `isPlatformBrowser()` and `isPlatformServer()` both answer false for. A
 * native app provides `'native'`, so a library can tell it apart - and one that guards its DOM
 * work with `isPlatformBrowser(id)` keeps its hands off, as it should, since there is no DOM here.
 *
 * ```ts
 * private readonly platformId = inject(PLATFORM_ID);
 * if (isPlatformNative(this.platformId)) { ... }
 * ```
 */
export const PLATFORM_NATIVE_ID = 'native';

/** Whether a `PLATFORM_ID` is a native app's, as `isPlatformBrowser()` is for a browser's. */
export function isPlatformNative(platformId: object | string): boolean {
  return platformId === PLATFORM_NATIVE_ID;
}
