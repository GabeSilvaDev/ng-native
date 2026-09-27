/**
 * The setup file `ngNative()` adds to Vitest: the globals the Metro preset installs as polyfills,
 * in place before a test file evaluates `@angular/core`. See `register.mjs` for why that order
 * matters and why `ngDevMode` is left alone.
 */
import { createRequire } from 'node:module';

createRequire(import.meta.url)('@ng-native/metro/polyfills/animation-globals.js');
// Metro's prelude defines this in every bundle, and app code reads it bare.
globalThis.__DEV__ ??= true;
