/**
 * `@ng-native/web/vite` keeps React Native out of a browser build and leaves the `@ng-native/*`
 * packages to `@oxc-angular/vite`'s linker.
 *
 * `scripts/verify-publish.mjs --web` proves the whole path from the registry in a browser; this
 * pins the configuration it depends on.
 */
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { ngNativeWeb } from '../vite.mjs';

const config = () => {
  const found = ngNativeWeb().find((candidate) => candidate.name === 'ng-native:config');
  assert.ok(found, 'no ng-native:config plugin');
  return (
    found as unknown as {
      config(): {
        optimizeDeps: { exclude: string[] };
        build: { rolldownOptions: { external(id: string): boolean } };
      };
    }
  ).config();
};

it('leaves the packages in pre-bundling, where the linker reaches them', () => {
  // The linker skips every package named in `optimizeDeps.exclude`, so excluding one ships its
  // partial declarations unlinked, and the page fails with "JIT compiler unavailable".
  const { exclude } = config().optimizeDeps;
  assert.equal(
    exclude.some((name) => name.startsWith('@ng-native/')),
    false,
  );
  assert.ok(exclude.includes('react-native'));
});

it('keeps React Native and Expo out of the build, and nothing else', () => {
  const { external } = config().build.rolldownOptions;
  assert.equal(external('react-native'), true);
  assert.equal(external('react-native/Libraries/Image/resolveAssetSource'), true);
  assert.equal(external('expo'), true);
  assert.equal(external('expo-camera'), false);
  assert.equal(external('react-native-svg'), false);
  assert.equal(external('@angular/core'), false);
});
