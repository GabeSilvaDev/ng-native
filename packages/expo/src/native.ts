/**
 * Reaching an Expo module without importing one.
 *
 * A static `import ... from 'expo-battery'` makes the file unloadable by Node, which is what used
 * to force every service into two files: the behaviour somewhere the test suite could reach, and
 * the binding somewhere it could not. A `require` inside a function has neither problem. Metro
 * still resolves the string literal at build time, so the module is bundled exactly as before and
 * an app that has not installed it still gets a build error rather than a surprise at runtime;
 * Node never evaluates the call at all, because nothing in a test asks for the real platform.
 *
 * The `catch` is doing two jobs, and only one of them is Node. In an ESM test `require` is not
 * defined, so calling it throws `ReferenceError` and the service goes inert - the same state as
 * a device that has no such sensor. On a device the throw is a module that is present but not
 * linked, which is the same answer for the same reason.
 */
export function optional<T>(load: () => T): T | null {
  try {
    return load();
  } catch {
    return null;
  }
}
