/**
 * `ngNative()`: the Vite plugin that lets Vitest run Angular Native code in Node, with no DOM.
 *
 * Four things, each of which Vitest would otherwise get wrong on its own:
 *
 * - It compiles. Every decorated `.ts` goes through `@ng-native/metro`'s AOT transform and every
 *   partial-compiled package through the linker (see `compile.mjs`), before Vite strips types.
 * - It inlines. Vitest hands `node_modules` straight to Node by default, which would mean an
 *   `@ng-native/*` package's `.ts` source reaching a runtime that refuses to strip types under
 *   `node_modules`, and `@angular/*` reaching it unlinked. Inlined, both come through the plugin.
 * - It adds a setup file with the globals Angular reads as it is first evaluated, and runs ES
 *   modules without the CommonJS variables Vitest otherwise injects into them.
 * - It stubs assets. With no `require`, an app's `require('./logo.png')` would throw; it becomes
 *   `{ testUri }` instead. And it stands in for the gesture and animation entry points, whose
 *   React Native source Node cannot load (`STAND_INS`).
 *
 * The environment is Vitest's default, `node`. There is no DOM to emulate: the renderer talks to
 * a fake Fabric, and jsdom would only give Angular a `document` to misread.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultClientConditions, defaultServerConditions } from 'vite';
import { compileAngular, needsAngular, stubAssets } from './compile.mjs';

const SETUP = fileURLToPath(new URL('./setup.mjs', import.meta.url));

/**
 * Entry points a test gets a stand-in for, because what they import is React Native source that
 * Node cannot load: the gestures and reanimated entry points of `@ng-native/components`, the
 * gesture library itself, which an app imports for `Gesture`, and Reanimated and worklets, which
 * an app imports for `withTiming` and `scheduleOnRN`. See each stand-in for what it does and does
 * not do.
 */
const STAND_INS = {
  '@ng-native/components/gestures': fileURLToPath(new URL('../src/gestures.ts', import.meta.url)),
  'react-native-gesture-handler': fileURLToPath(
    new URL('../src/gesture-handler.ts', import.meta.url),
  ),
  '@ng-native/components/reanimated': fileURLToPath(
    new URL('../src/reanimated.ts', import.meta.url),
  ),
  'react-native-reanimated': fileURLToPath(
    new URL('../src/reanimated-library.ts', import.meta.url),
  ),
  'react-native-worklets': fileURLToPath(new URL('../src/worklets-library.ts', import.meta.url)),
};

/**
 * ponytail: inlining is by package name, so a third-party Angular library other than these has
 * to be named in `inline` by the app. Linking whatever turns out to be partial-compiled would
 * mean inlining every dependency, which is slower and breaks CommonJS packages.
 */
const INLINE = [
  /\/node_modules\/@angular\//,
  /\/node_modules\/@ng-native\//,
  /\/node_modules\/@ng-icons\//,
];

/**
 * `compilerOptions.customConditions` from the project's `tsconfig.json`, less `react-native`,
 * which would send a test to React Native's Flow source.
 *
 * @param {string} root
 * @returns {string[]}
 */
function tsconfigConditions(root) {
  try {
    const conditions = JSON.parse(readFileSync(path.join(root, 'tsconfig.json'), 'utf8'))
      .compilerOptions?.customConditions;
    return Array.isArray(conditions) ? conditions.filter((c) => c !== 'react-native') : [];
  } catch {
    return [];
  }
}

/** @param {string[]} conditions */
function withConditions(conditions) {
  if (conditions.length === 0) return {};
  return {
    resolve: { conditions: [...conditions, ...defaultClientConditions] },
    ssr: { resolve: { conditions: [...conditions, ...defaultServerConditions] } },
  };
}

/**
 * `injectCjsGlobals: false` again, for Vitest 4, which has no such option and hands every module
 * a `require` regardless. A module that probes for one then requires React Native's Flow source.
 * A `var` of the same name shadows the one Vitest passes in, and is harmless where there is none.
 * On the first line, so every other line keeps its number. ES modules only: a CommonJS file needs
 * the real thing.
 *
 * @param {string} code
 * @param {string} file
 */
function hideRequire(code, file) {
  if (!/\.(ts|mts|mjs)$/.test(file) || !/\brequire\b/.test(code)) return code;
  // A module that makes its own, with `createRequire`, already sees the one it means.
  if (/\b(?:const|let|var|function|class)\s+require\b/.test(code)) return code;
  return `var require = undefined; ${code}`;
}

/**
 * @param {{ inline?: (string | RegExp)[] }} [options]
 * @returns {import('vitest/config').Plugin}
 */
export function ngNative(options = {}) {
  return {
    name: 'ng-native',
    enforce: 'pre',
    config: (config) => ({
      // The conditions the project's tsconfig resolves packages with, ahead of Vite's own, so a
      // test takes the same entry tsc does: Nx's TypeScript preset exports a library's source
      // only under one.
      ...withConditions(tsconfigConditions(config?.root ?? process.cwd())),
      test: {
        setupFiles: [SETUP],
        // Vitest hands every ES module a CommonJS `require` by default, for compatibility with an
        // older runner. Code here checks for one to tell a device from Node: given one, it
        // requires `react-native`, whose Flow source nothing in a test can parse. Off, a module
        // sees what it sees under Node itself.
        injectCjsGlobals: false,
        server: { deps: { inline: [...INLINE, ...(options.inline ?? [])] } },
      },
    }),
    resolveId(source) {
      return Object.hasOwn(STAND_INS, source) ? STAND_INS[source] : null;
    },
    transform(source, id) {
      const file = id.split('?')[0];
      if (file.startsWith('\0') || !/\.m?[jt]s$/.test(file)) return null;
      const code = file.includes('/node_modules/') ? source : stubAssets(source);
      if (!needsAngular(code, file)) {
        const hidden = hideRequire(code, file);
        return hidden === source ? null : { code: hidden, map: null };
      }
      const result = compileAngular(code, file);
      for (const dependency of result.dependencies) this.addWatchFile(dependency);
      return { code: hideRequire(result.code, file), map: result.map ?? null };
    },
  };
}
