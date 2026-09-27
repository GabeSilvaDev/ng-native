/**
 * The preview frame, `learn-preview.html`: where the learner's code is compiled, mounted, styled
 * and tested. It is a frame of its own so that Tailwind's browser build, the platform and dark
 * classes and the learner's code cannot reach the lesson page around it.
 *
 * It answers the messages in `protocol.ts` one at a time, in the order they arrive.
 */
import { publishFacade } from '@angular/compiler';
import * as common from '@angular/common';
import * as core from '@angular/core';
import * as components from '@ng-native/components';
import * as device from '@ng-native/device';
import { registerPlatformComponents } from '@ng-native/fabric';
import * as testing from '@ng-native/testing';
import type { FromPreview, Platform, ToPreview } from '../protocol.ts';
import { compileNativeCss, compileNativeTailwind, type NativeSheet } from './native-css.ts';
import { lowerSource } from './lower-source.ts';
import { Phone } from './phone.ts';
import {
  compileTemplates,
  createProgram,
  ProblemError,
  runtimeProblem,
  type CompiledFile,
  type Problem,
} from './program.ts';
import { applyTailwind, tailwindCss, type TailwindOutput } from './tailwind.ts';
import { runChecks, runTestFile, type RunnerOptions } from './test-runner.ts';
import { vitest } from './vitest-api.ts';
import { Xray } from './xray.ts';

// `import '@angular/compiler'` is not enough in a production build: the build optimiser marks
// the compiler's own top-level `publishFacade(_global)` as pure, the bundler drops it, and the
// first decorated class throws "JIT compiler unavailable". So it is called here, by hand.
publishFacade(globalThis);

const platform: Platform =
  new URLSearchParams(location.search).get('platform') === 'android' ? 'android' : 'ios';
registerPlatformComponents(platform);
// The engine's development checks, which a device build in development runs too. See `engineNotes`.
(globalThis as { __DEV__?: boolean }).__DEV__ = true;
const ENGINE = '[angular-native]';

/**
 * `@ng-native/device` asks `require('react-native')` for each capability, and takes "no
 * `require`" to mean "not on a device". A production build leaves a `require` behind anyway: the
 * bundler's stand-in for the modules it was told are external, which throws when called. The web
 * host never gets that far, because `mount` provides the browser's own sources; a test renders on
 * the fake Fabric, where nothing does. The stand-in defers to a global `require` if there is one,
 * so this is one, and it answers React Native with nothing, which is the off-device answer.
 */
(globalThis as { require?: (id: string) => unknown }).require = (id: string) => {
  if (id === 'react-native' || id.startsWith('react-native/') || id === 'expo') return null;
  throw new Error(`"${id}" is not available in the preview.`);
};

const APP_LIBRARIES: Record<string, unknown> = {
  '@angular/core': core,
  '@angular/common': common,
  '@ng-native/components': components,
  '@ng-native/device': device,
};

/** Packages only some lessons use, downloaded the first time a file imports one. */
const ON_DEMAND: Record<string, () => Promise<unknown>> = {
  '@angular/forms/signals': () => import('@angular/forms/signals'),
};

const loaded: Record<string, unknown> = {};

/** The packages `sources` may import: the ones every lesson has, and any of the others they name. */
async function librariesFor(sources: readonly string[]): Promise<Record<string, unknown>> {
  const named = Object.keys(ON_DEMAND).filter(
    (specifier) =>
      !(specifier in loaded) &&
      sources.some(
        (source) => source.includes(`'${specifier}'`) || source.includes(`"${specifier}"`),
      ),
  );
  await Promise.all(
    named.map(async (specifier) => (loaded[specifier] = await ON_DEMAND[specifier]!())),
  );
  return { ...APP_LIBRARIES, ...loaded };
}

/**
 * `@ng-native/testing` as the learner's tests import it: the real package, with `render` given the
 * app's Tailwind styles as a device build would compile them, since an app's own test setup
 * passes its compiled sheet the same way.
 */
function testLibraries(libraries: Record<string, unknown>, globalStyles: NativeSheet | undefined) {
  const render: typeof testing.render = (component, options = {}) =>
    testing.render(component, { globalStyles: globalStyles as never, ...options });
  return { ...libraries, '@ng-native/testing': { ...testing, render }, vitest };
}

/**
 * `location.origin` is the site's, not this document's: the sandbox makes the frame's origin
 * opaque but leaves its URL alone, so this reaches the lesson page and nothing else.
 */
function post(message: FromPreview): void {
  parent.postMessage(message, location.origin);
}

let testsRunning = false;
const report = (problem: Problem) => {
  if (!testsRunning) post({ type: 'problem', problem });
};

const phone = new Phone(document.getElementById('screen')!, platform, (error) =>
  report(runtimeProblem(error)),
);
const xray = new Xray(() => phone.root);

function problemOf(error: unknown): Problem {
  return error instanceof ProblemError ? error.problem : runtimeProblem(error);
}

function pickComponent(exports: Record<string, unknown>, entry: string): core.Type<unknown> {
  const isComponent = (value: unknown) => typeof value === 'function' && 'ɵcmp' in value;
  const found = [exports['App'], exports['default'], ...Object.values(exports)].find(isComponent);
  if (!found) {
    throw new ProblemError({
      kind: 'import',
      file: entry,
      message: `${entry} does not export a component. Export the class that has @Component on it, as "export class App".`,
    });
  }
  return found as unknown as core.Type<unknown>;
}

async function run(
  id: number,
  files: Readonly<Record<string, string>>,
  entry: string,
  baseline: Readonly<Record<string, string>> | undefined,
): Promise<void> {
  const started = performance.now();
  const libraries = await librariesFor(Object.values(files));
  const program = createProgram({ files, libraries });
  let component: core.Type<unknown>;
  let compiled: number;
  try {
    const exports = program.load(entry);
    compiled = performance.now();
    compileTemplates(program);
    component = pickComponent(exports, entry);
  } catch (error) {
    post({ type: 'ran', id, ok: false, problems: [problemOf(error)] });
    return;
  }
  const templates = performance.now();
  const tailwind = await tailwindCss(files);
  const errors = phone.replace(component);
  if (errors.length) {
    post({ type: 'ran', id, ok: false, problems: errors.map((error) => runtimeProblem(error)) });
    return;
  }
  applyTailwind(tailwind.css);
  xray.refresh();
  const done = performance.now();
  post({
    type: 'ran',
    id,
    ok: true,
    problems: [],
    timings: {
      compile: compiled - started,
      templates: templates - compiled,
      mount: done - templates,
      total: done - started,
    },
  });
  // Awaited, so the next message waits: the engine check renders on the fake Fabric, as a
  // check does, and two renders at once would clean each other up.
  const compiledFiles = [...program.compiled.values()];
  const notes = [
    ...((await stylesChanged(compiledFiles, tailwind, baseline))
      ? await cssNotes(compiledFiles, tailwind)
      : []),
    ...(await engineNotes(component)),
  ];
  post({ type: 'notes', notes });
}

/**
 * What the engine says in development about the app, once, on the fake Fabric: an element used
 * without importing its component, or a name nothing claims. A browser renders both without a
 * word, and a phone renders them wrong.
 */
async function engineNotes(component: core.Type<unknown>): Promise<Problem[]> {
  const said = new Set<string>();
  const report = console.error;
  console.error = (...args: unknown[]) => {
    const message = args.map(String).join(' ');
    if (message.startsWith(ENGINE)) said.add(message.slice(ENGINE.length).trim());
    else report(...args);
  };
  testsRunning = true;
  try {
    await testing.render(component);
  } catch {
    // The preview has already reported whatever this would throw.
  } finally {
    testing.cleanup();
    console.error = report;
    testsRunning = false;
  }
  return [...said].map((message) => ({ kind: 'device', message }));
}

/** Each file's component styles, by class, as one string to compare. */
function stylesheetsOf(entries: readonly (readonly [string, Record<string, { css: string }>])[]) {
  return JSON.stringify(
    entries
      .filter(([, styles]) => Object.keys(styles).length > 0)
      .map(([file, styles]) => [file, Object.entries(styles).map(([name, { css }]) => [name, css])])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  );
}

let baselineSheets: { key: string; sheets: string; tailwind: string } | undefined;

/**
 * Whether any stylesheet, or the CSS Tailwind writes for the classes, differs from the lesson's
 * starting point: the moment there can be something new for the native compiler to say.
 */
async function stylesChanged(
  files: readonly CompiledFile[],
  tailwind: TailwindOutput,
  baseline: Readonly<Record<string, string>> | undefined,
): Promise<boolean> {
  if (!baseline) return true;
  const key = JSON.stringify(baseline);
  if (baselineSheets?.key !== key) {
    try {
      const lowered = Object.entries(baseline)
        .filter(([file]) => file.endsWith('.ts'))
        .map(([file, source]) => [file, lowerSource(source).styles] as const);
      baselineSheets = {
        key,
        sheets: stylesheetsOf(lowered),
        tailwind: (await tailwindCss(baseline)).css,
      };
    } catch {
      return true;
    }
  }
  const current = stylesheetsOf(files.map(({ file, lowered }) => [file, lowered.styles] as const));
  return current !== baselineSheets.sheets || tailwind.css !== baselineSheets.tailwind;
}

/** What a device build would say about each component's CSS. */
async function cssNotes(
  files: readonly CompiledFile[],
  tailwind: TailwindOutput,
): Promise<Problem[]> {
  const notes: Problem[] = [];
  if (tailwind.used) {
    const { dropped, error } = await compileNativeTailwind(tailwind.css);
    for (const message of error ? [error] : dropped) notes.push({ kind: 'css', message });
  }
  for (const { file, lowered } of files) {
    for (const [className, styles] of Object.entries(lowered.styles)) {
      const { dropped, error } = await compileNativeCss(styles.css, `${file} (${className})`);
      for (const message of error ? [error] : dropped) {
        notes.push({
          kind: 'css',
          file,
          line: styles.at.line,
          column: styles.at.column,
          message,
        });
      }
    }
  }
  return notes;
}

/**
 * Give each component its native stylesheet before a test renders it, as Metro's transform does
 * for a device build, so a test reads the styles a phone would commit.
 */
async function attachNativeSheets(files: readonly CompiledFile[]): Promise<void> {
  for (const { file, lowered, classes } of files) {
    for (const type of classes) {
      const styles = lowered.styles[type.name];
      if (!styles) continue;
      const { sheet } = await compileNativeCss(styles.css, `${file} (${type.name})`);
      if (sheet) (type as unknown as Record<string, unknown>)['ɵnativeStyles'] = sheet;
    }
  }
}

async function whileTesting<T>(
  files: Readonly<Record<string, string>>,
  extra: string,
  work: (options: RunnerOptions) => Promise<T>,
): Promise<T> {
  testsRunning = true;
  try {
    const libraries = await librariesFor([...Object.values(files), extra]);
    return await work({
      files,
      libraries: testLibraries(libraries, undefined),
      nativeStyles: async () => {
        const tailwind = await tailwindCss(files);
        const { sheet } = tailwind.used ? await compileNativeTailwind(tailwind.css) : {};
        return { libraries: testLibraries(libraries, sheet), prepare: attachNativeSheets };
      },
    });
  } finally {
    testsRunning = false;
  }
}

async function handle(message: ToPreview): Promise<void> {
  switch (message.type) {
    case 'run':
      await run(message.id, message.files, message.entry, message.baseline);
      return;
    case 'appearance':
      phone.setScheme(message.appearance.scheme);
      xray.set(message.appearance.xray);
      return;
    case 'test': {
      const outcomes = await whileTesting(message.files, '', (options) =>
        runTestFile(options, message.file),
      );
      post({ type: 'tested', id: message.id, outcomes });
      return;
    }
    case 'check': {
      const outcomes = await whileTesting(message.files, message.checks, (options) =>
        runChecks(options, message.checks, message.step),
      );
      post({ type: 'checked', id: message.id, outcomes });
    }
  }
}

let queue = Promise.resolve();
addEventListener('message', (event: MessageEvent<ToPreview>) => {
  if (event.source !== parent || event.origin !== location.origin) return;
  queue = queue.then(() => handle(event.data)).catch((error: unknown) => report(problemOf(error)));
});

addEventListener('error', (event) => report(runtimeProblem(event.error ?? event.message)));
addEventListener('unhandledrejection', (event) => report(runtimeProblem(event.reason)));

/**
 * NG0912, "component ID generation collision", is every run after the first: the same component
 * compiled again hashes to the same ID, which is the point of a rerun rather than a mistake.
 */
const EXPECTED = /^NG0912:/;

// Angular reports what it finds wrong at run time - an unknown property binding, an expression
// that changed after it was checked - on the console, where a learner would never look.
for (const level of ['error', 'warn'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    const message = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    if (EXPECTED.test(message)) return;
    original(...args);
    report({ kind: 'console', message });
  };
}

post({ type: 'ready', platform });
setInterval(() => post({ type: 'alive' }), 1000);
