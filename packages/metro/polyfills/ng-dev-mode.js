/**
 * Angular decides dev mode from a global: `initNgDevMode()` treats an *undefined* `ngDevMode` as
 * "dev" and installs its perf counters. The Angular CLI replaces the identifier with `false` at
 * build time; nothing in a Metro pipeline does, so without this a release bundle runs Angular
 * with every dev-mode assertion, check and error message live.
 *
 * Loaded as a Metro polyfill so it runs before @angular/core is evaluated.
 *
 * ponytail: this switches the behaviour off but cannot shrink the bundle, because `ngDevMode`
 * stays a runtime global and the minifier cannot fold the branches. Replacing the identifier
 * with a literal in a babel plugin would also strip the dead code; do that when size matters.
 */
if (typeof __DEV__ !== 'undefined' && !__DEV__) {
  globalThis.ngDevMode = false;
}
