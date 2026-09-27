/**
 * Every native view a package renders comes from a module the app can be told to install.
 *
 * Expo Go bundles react-native-screens, safe-area-context, svg and gesture-handler, so a package
 * that renders their views without declaring them works there and nowhere else: a development or
 * release build links only what the app lists, and the view commits as `Unimplemented component`.
 * The template shipped exactly that for `<safe-area-view>`, found only by a release build.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = (dir: string) =>
  JSON.parse(readFileSync(`${root}${dir}/package.json`, 'utf8')) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };

/** Longest prefix first: `RNSVG` is svg, not screens. */
const MODULES: [prefix: string, module: string][] = [
  ['RNSVG', 'react-native-svg'],
  ['RNCSafeArea', 'react-native-safe-area-context'],
  ['RNGestureHandler', 'react-native-gesture-handler'],
  ['RNS', 'react-native-screens'],
];

function nativeModulesUsedBy(pkg: string): Set<string> {
  const used = new Set<string>();
  const dir = `${root}packages/${pkg}/src`;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts') || file.endsWith('.generated.ts')) {
      continue;
    }
    for (const [, name] of readFileSync(`${dir}/${file}`, 'utf8').matchAll(/'(RN[A-Z]\w+)'/g)) {
      const module = MODULES.find(([prefix]) => name!.startsWith(prefix))?.[1];
      if (module) used.add(module);
    }
  }
  return used;
}

describe('native modules', () => {
  for (const pkg of ['components', 'router', 'icons']) {
    it(`@ng-native/${pkg} declares every module whose views it renders`, () => {
      const peers = manifest(`packages/${pkg}`).peerDependencies ?? {};
      for (const module of nativeModulesUsedBy(pkg)) {
        assert.ok(module in peers, `${module} is rendered but not a peer`);
      }
    });
  }

  it('the template installs what its own app renders', () => {
    const app = readFileSync(`${root}template/src/app/app.ts`, 'utf8');
    const deps = manifest('template').dependencies ?? {};
    if (app.includes('<safe-area-view')) assert.ok('react-native-safe-area-context' in deps);
  });
});
