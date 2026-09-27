import type { PluginOptions } from '@oxc-angular/vite';
import type { Plugin } from 'vite';

/**
 * The Vite preset for a browser app on `@ng-native/web`: compiles the app's components, links the
 * `@ng-native/*` packages, and keeps React Native and Expo out of the build.
 *
 * `options` go to `@oxc-angular/vite`'s `angular()`, over `zoneless: true` and
 * `emitClassMetadata: false`.
 */
export declare function ngNativeWeb(options?: PluginOptions): Plugin[];
