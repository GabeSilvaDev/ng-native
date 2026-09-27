import type { Plugin } from 'vitest/config';

export interface NgNativeOptions {
  /**
   * More packages for Vitest to process rather than hand to Node, for an Angular library that
   * ships partial-compiled. `@angular/*`, `@ng-native/*` and `@ng-icons/*` are always included.
   */
  inline?: (string | RegExp)[];
}

/** Compile Angular for Vitest: AOT for decorated sources, the linker for partial-compiled packages. */
export declare function ngNative(options?: NgNativeOptions): Plugin;
