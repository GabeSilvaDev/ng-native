/**
 * The Vitest plugin hides CommonJS `require` from the modules it transforms, on every Vitest.
 *
 * Code here probes `typeof require` to tell a device from Node: given one, it requires
 * `react-native` or an Expo module, whose Flow source nothing in a test can parse. Vitest 5 has
 * `injectCjsGlobals: false` to leave it out; Vitest 4 has no such option and always passes one
 * in, so a routing test failed with "Unexpected token 'typeof'". The plugin now shadows it itself.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { ngNative } from '../runner/vitest.mjs';

type Transform = (source: string, id: string) => { code: string } | string | null;

it('shadows an injected require in a module that probes for one', () => {
  const transform = ngNative().transform as unknown as Transform;
  const source =
    "export const found = typeof require === 'function' ? require('react-native') : null;";
  const result = transform(source, '/app/src/device.ts');
  const code = typeof result === 'string' ? result : (result?.code ?? source);

  // Vitest 4 evaluates a module inside a function that is handed `require`, as this does.
  const exports: { found?: unknown } = {};
  const body = code.replace('export const found', 'exports.found');
  new Function('require', 'exports', body)(() => 'react-native loaded', exports);
  assert.equal(exports.found, null);
});

it('fails a component whose template the compiler would cut short, rather than rendering half', () => {
  // `@if (on() {` compiled to the elements before it and nothing after, and the render passed.
  const transform = ngNative().transform as unknown as Transform;
  const source =
    "import { Component } from '@angular/core';\n" +
    "@Component({ selector: 'x-cut', template: '<text>a</text> @if (on() { <text>b</text> }' })\n" +
    'export class Cut { on() { return true; } }\n';
  assert.throws(
    () => transform(source, '/app/src/cut.ts'),
    /Cut's template does not parse: Incomplete block "if"/,
  );
});

it('leaves a module that never mentions require alone', () => {
  const transform = ngNative().transform as unknown as Transform;
  assert.equal(transform('export const a = 1;', '/app/src/a.ts'), null);
});

it('leaves a module that declares its own require alone', () => {
  // A test file that makes one with `createRequire`, which a shadow would redeclare.
  const transform = ngNative().transform as unknown as Transform;
  const source =
    "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);\nrequire('x');";
  assert.equal(transform(source, '/app/src/a.test.ts'), null);
});

it("resolves with the project's tsconfig customConditions, beside Vite's own", () => {
  // Nx's TypeScript preset exports a library's source only under a custom condition, and a test
  // that imported one failed to resolve its entry.
  const root = mkdtempSync(path.join(tmpdir(), 'ng-native-conditions-'));
  writeFileSync(
    path.join(root, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { customConditions: ['react-native', '@org/source'] } }),
  );
  try {
    const plugin = ngNative() as unknown as {
      config(config: { root?: string }): {
        resolve?: { conditions?: string[] };
        ssr?: { resolve?: { conditions?: string[] } };
      };
    };
    const config = plugin.config({ root });
    assert.equal(config.ssr?.resolve?.conditions?.[0], '@org/source');
    assert.ok(config.ssr?.resolve?.conditions?.includes('node'));
    assert.equal(config.resolve?.conditions?.[0], '@org/source');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
