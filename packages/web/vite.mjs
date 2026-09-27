/**
 * `ngNativeWeb()`: the Vite preset for a browser app that renders `@ng-native/components` through
 * `@ng-native/web`.
 *
 * Two plugins, in this order:
 *
 * - `ng-native:config`, the resolution a browser build needs. React Native and Expo are reachable
 *   from the packages behind guards a browser never passes, but a bundler still resolves every
 *   specifier it sees, and React Native's source is Flow. They stay out of the build.
 * - `@oxc-angular/vite`'s own plugins, for the app's components and for the linker, which handles
 *   the `@ng-native/*` packages as it handles every partial-compiled Angular library on npm.
 */
import { angular } from '@oxc-angular/vite';

/**
 * What the packages `require` on a device, behind a check a browser never passes. Only these: an
 * import of anything else native-only is a module a browser build really would need, so it fails
 * the build rather than the page.
 */
const NATIVE_ONLY = ['react-native', 'expo'];
const NATIVE_ONLY_PATTERN = /^(react-native|expo)(\/|$)/;

/** @returns {import('vite').Plugin} */
function config() {
  return {
    name: 'ng-native:config',
    config: () => ({
      optimizeDeps: { exclude: NATIVE_ONLY },
      build: { rolldownOptions: { external: (id) => NATIVE_ONLY_PATTERN.test(id) } },
    }),
  };
}

/**
 * @param {import('@oxc-angular/vite').PluginOptions} [options] passed on to `@oxc-angular/vite`'s
 *   `angular()`, over `zoneless: true` and `emitClassMetadata: false`.
 * @returns {import('vite').Plugin[]}
 */
export function ngNativeWeb(options = {}) {
  return [config(), ...angular({ zoneless: true, emitClassMetadata: false, ...options })];
}
