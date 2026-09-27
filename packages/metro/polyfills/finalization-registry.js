/**
 * `FinalizationRegistry`, for Hermes, which has `WeakRef` but not this.
 *
 * Angular 22.2 builds one while `@angular/core` is first evaluated, for its signal debug graph:
 * a watched signal registers itself so the graph can forget it once it is collected. Without the
 * global that line throws, and the bundle stops before `main` is registered - on both platforms,
 * in a release build as much as a development one.
 *
 * Loaded as a Metro polyfill so it runs before @angular/core is evaluated.
 *
 * ponytail: a registry that never calls back. The debug graph keeps an entry for a signal nobody
 * watches any more, which only devtools read; if Hermes ships the real one, it is used instead.
 */
if (typeof globalThis.FinalizationRegistry === 'undefined') {
  globalThis.FinalizationRegistry = class FinalizationRegistry {
    register() {}
    unregister() {
      return false;
    }
  };
}
