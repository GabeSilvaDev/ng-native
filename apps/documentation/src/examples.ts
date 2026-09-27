/**
 * The examples, found by name rather than listed by hand.
 *
 * `<!-- example: button-variants -->` in a markdown file names `src/examples/button-variants.ts`,
 * and the two globs below give the page both halves of what it needs: the component to mount, and
 * the file's own text to show beside it. They are the same glob twice because the second carries
 * `?source`, which `build/source.ts` answers with the file read off disk and highlighted - so the
 * code on the page is the code that ran, not a transcription of it that can quietly go stale.
 *
 * Lazy on purpose. Each example imports its own slice of `@ng-native/components`; loading
 * every example for whichever page a reader opened would mean the whole set on every page.
 */
import type { Type } from '@angular/core';
import type { LoadedExample } from './example.ts';

interface ExampleModule {
  readonly default: Type<unknown>;
  /** For an example that cannot size itself - a scroll view, a chart - in pixels. */
  readonly height?: number;
}

interface SourceModule {
  readonly html: string;
  readonly text: string;
}

const components = import.meta.glob<ExampleModule>('./examples/*.ts');
const sources = import.meta.glob<SourceModule>('./examples/*.ts', { query: '?source' });

function key(name: string): string {
  return `./examples/${name}.ts`;
}

/** Whether a name in a markdown file corresponds to a file on disk. */
export function hasExample(name: string): boolean {
  return key(name) in components;
}

/**
 * One loader per name, kept, because the identity matters and not only the behaviour: the page
 * passes this to `doc-example` as an input, and a new function object each time change detection
 * ran would read as a changed input and remount the example.
 */
const loaders = new Map<string, () => Promise<LoadedExample>>();

/**
 * A loader for one example, or one that reports the missing file.
 *
 * Reported rather than thrown: a typo in a marker should leave the rest of the page readable and
 * say which name did not resolve, which is more useful than a blank page and a console trace.
 */
export function exampleLoader(name: string): () => Promise<LoadedExample> {
  const cached = loaders.get(name);
  if (cached) return cached;
  const loader = buildLoader(name);
  loaders.set(name, loader);
  return loader;
}

function buildLoader(name: string): () => Promise<LoadedExample> {
  const component = components[key(name)];
  const source = sources[key(name)];
  if (!component || !source) {
    return () => Promise.reject(new Error(`No example named "${name}" in src/examples`));
  }
  return async () => {
    const [loaded, text] = await Promise.all([component(), source()]);
    return {
      component: loaded.default,
      height: loaded.height,
      source: text.html,
      text: text.text,
    };
  };
}
