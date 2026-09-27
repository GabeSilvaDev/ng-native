/**
 * Registers `@ng-native/testing`'s Angular hook for this suite. Passed to `node --import` by the
 * test script, so it is in place before any `@angular/*` module is evaluated.
 *
 * The public hook, not a copy of it, with one difference: this suite compiles some files itself.
 * `compileFixture` owns the fixtures, some of which are meant to fail compilation (that is what
 * they assert); a `.generated.ts` is its output, already compiled; and a test file's own source
 * can carry a decorator inside a string it never means to compile. So those are skipped, and Node
 * strips their types as it would anyway.
 *
 * The animation globals go in here for the same reason `@ng-native/testing/register` installs
 * them: `@angular/core` decides whether `animate.enter` and `animate.leave` do anything at all when
 * it is first evaluated, so this is the last moment that answer can be influenced.
 */
import { register } from 'node:module';
import '../metro/polyfills/animation-globals.js';

register('@ng-native/testing/loader', import.meta.url, {
  data: { skip: ['/fixtures/', '.generated.ts', '.test.ts'] },
});
