/**
 * Registers `@ng-native/testing`'s Angular hook, exactly as `packages/integration-tests` does and
 * for the same reasons: see its `register-linker.mjs`. Passed to `node --import` by the test
 * script, so it is in place before any `@angular/*` module is evaluated.
 */
import { register } from 'node:module';
import '../metro/polyfills/animation-globals.js';

register('@ng-native/testing/loader', import.meta.url, {
  // `web-view-app.ts` is a DOM component for a web view, compiled as Metro compiles one.
  data: { skip: ['/fixtures/', '.generated.ts', '.test.ts'], web: ['/web-view-app.ts'] },
});
