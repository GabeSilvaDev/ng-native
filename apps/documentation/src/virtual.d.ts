/**
 * The API extraction, served by `build/api.ts` as a virtual module.
 *
 * Declared rather than imported from a real file because there is no file: the plugin generates
 * the module's source at build time from the workspace's own TypeScript. See `build/api.ts`.
 */
declare module 'virtual:angular-native/api' {
  import type { ApiEntry } from '../build/api.ts';
  /** Every declaration, keyed `@ng-native/components#Switch`. */
  export const API: Record<string, ApiEntry>;
  export default API;
}

/** An example's own source, read off disk and highlighted at build time by `build/source.ts`. */
declare module '*.ts?source' {
  export const html: string;
  export const text: string;
}

declare module '*.ts?excerpt' {
  export const html: string;
  export const text: string;
}

/** Every example app's source files, read out of its folder by `build/example-sources.ts`. */
declare module 'virtual:angular-native/example-sources' {
  export interface ExampleSourceFile {
    /** Relative to the app's folder, with forward slashes. */
    readonly path: string;
    /** The file, highlighted. */
    readonly load: () => Promise<string>;
  }
  /** Keyed by the app's slug. */
  export const EXAMPLE_SOURCES: Record<string, readonly ExampleSourceFile[]>;
}
