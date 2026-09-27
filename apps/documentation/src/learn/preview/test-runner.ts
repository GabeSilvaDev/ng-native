/**
 * The learner's tests and the lesson's checks, run in the preview against the fake Fabric.
 *
 * `render()` from `@ng-native/testing` is a real `mount()` onto a `createFakeFabric()`, exactly as
 * under Node: nothing here reads the phone's DOM. A test file is compiled like any other file,
 * with `vitest` answered by `vitest-api.ts`, so a test written here runs unchanged in an app.
 */
import * as testing from '@ng-native/testing';
import * as checkApi from '../check.ts';
import type { Check, CheckContext, TestOutcome } from '../check.ts';
import { createProgram, locate, ProblemError, type CompiledFile, type Program } from './program.ts';
import { collectTests, type RegisteredTest } from './vitest-api.ts';

/** What a run that reads styles adds: the app's CSS, compiled as a device build would. */
export interface NativeStyles {
  /** Packages in place of the plain ones: `@ng-native/testing` rendering with the global sheet. */
  readonly libraries: Readonly<Record<string, unknown>>;
  /** Called with every file compiled before its tests run, to give components their native CSS. */
  readonly prepare: (files: readonly CompiledFile[]) => Promise<void>;
}

export interface RunnerOptions {
  readonly files: Readonly<Record<string, string>>;
  readonly libraries: Readonly<Record<string, unknown>>;
  /**
   * The native styles, for a check marked `readsStyles` or a test file that reads `props`. Only
   * called for one, because in the preview it is what downloads the native CSS compiler.
   */
  readonly nativeStyles?: () => Promise<NativeStyles>;
  /** How long one test may take. */
  readonly timeoutMs?: number;
}

/**
 * Whether a test file reads what a node was committed with, which is where its styles are. A
 * test that finds things by text or role, as most do, runs without the native CSS compiler.
 */
const readsProps = (source: string | undefined): boolean => /\.props\b/.test(source ?? '');

export interface CheckOutcome extends TestOutcome {
  readonly step: number;
  readonly hint?: string;
}

const describeProblem = (error: unknown): string =>
  error instanceof ProblemError
    ? `${error.problem.file ? `${error.problem.file}${error.problem.line ? `:${error.problem.line}` : ''}: ` : ''}${error.problem.message}`
    : error instanceof Error
      ? error.message
      : String(error);

function withTimeout(run: () => unknown, ms: number): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.resolve().then(run),
    new Promise((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Took longer than ${ms / 1000} seconds, so it was stopped.`)),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

async function runOne(name: string, run: () => unknown, timeoutMs: number): Promise<TestOutcome> {
  const started = performance.now();
  try {
    await withTimeout(run, timeoutMs);
    return { name, ok: true, ms: performance.now() - started };
  } catch (error) {
    const where = locate(error);
    return {
      name,
      ok: false,
      error: describeProblem(error),
      file: where?.file,
      line: where?.line,
      ms: performance.now() - started,
    };
  } finally {
    testing.cleanup();
  }
}

async function runRegistered(
  tests: readonly RegisteredTest[],
  timeoutMs: number,
): Promise<TestOutcome[]> {
  const outcomes: TestOutcome[] = [];
  for (const test of tests) {
    outcomes.push(
      await runOne(
        test.name,
        async () => {
          for (const hook of test.before) await hook();
          try {
            await test.run();
          } finally {
            for (const hook of test.after) await hook();
          }
        },
        timeoutMs,
      ),
    );
  }
  return outcomes;
}

function compileWith(
  options: RunnerOptions,
  entry: string,
  extra: Readonly<Record<string, string>> = {},
  overrides: Readonly<Record<string, Record<string, unknown>>> = {},
  styles?: NativeStyles,
): { program: Program; load: () => Promise<void> } {
  const program = createProgram({
    files: { ...options.files, ...extra },
    libraries: { ...options.libraries, ...styles?.libraries },
    overrides: { 'check.ts': checkApi, ...overrides },
    missingIsEmptyIn: 'checks.ts',
  });
  return {
    program,
    load: async () => {
      program.load(entry);
      await styles?.prepare([...program.compiled.values()]);
    },
  };
}

/** One of the learner's test files: each `it()` in it, run in order. */
export async function runTestFile(
  options: RunnerOptions,
  file: string,
  overrides?: Readonly<Record<string, Record<string, unknown>>>,
): Promise<TestOutcome[]> {
  const styles = readsProps(options.files[file]) ? await options.nativeStyles?.() : undefined;
  const { load } = compileWith(options, file, {}, overrides, styles);
  let tests: RegisteredTest[];
  try {
    tests = await collectTests(load);
  } catch (error) {
    return [{ name: `Compiling ${file}`, ok: false, error: describeProblem(error), ms: 0 }];
  }
  if (!tests.length) {
    return [{ name: file, ok: false, error: `${file} has no tests in it yet.`, ms: 0 }];
  }
  return runRegistered(tests, options.timeoutMs ?? 5000);
}

/**
 * Load a lesson's checks for their definitions. If the learner's code does not compile, they are
 * loaded again with every learner file empty, for their names, and `failure` says why.
 */
async function registerChecks(
  options: RunnerOptions,
  checks: string,
  styles?: NativeStyles,
): Promise<{ registered: Check[]; failure?: unknown }> {
  checkApi.takeChecks();
  try {
    await compileWith(options, 'checks.ts', { 'checks.ts': checks }, {}, styles).load();
    return { registered: checkApi.takeChecks() };
  } catch (failure) {
    checkApi.takeChecks();
    const empty = Object.fromEntries(Object.keys(options.files).map((file) => [file, {}]));
    compileWith(options, 'checks.ts', { 'checks.ts': checks }, empty).program.load('checks.ts');
    return { registered: checkApi.takeChecks(), failure };
  }
}

/**
 * A lesson's checks, up to and including `step`, against the learner's files.
 *
 * The checks that read styles run against a second compile of the same files, one with the native
 * styles attached, and only when there is one to run. The rest never see a compiled style, so a
 * check that reads one without saying so fails here and in `lessons.test.ts`, not on a learner.
 */
export async function runChecks(
  options: RunnerOptions,
  checks: string,
  step: number,
): Promise<CheckOutcome[]> {
  const { registered, failure } = await registerChecks(options, checks);
  const due = registered.filter((c) => c.step <= step);
  let styled: Check[] = [];
  if (!failure && options.nativeStyles && due.some((c) => c.readsStyles)) {
    styled = (await registerChecks(options, checks, await options.nativeStyles())).registered;
  }
  const context: CheckContext = {
    file: (name) => options.files[name] ?? '',
    runTests: (file, runOptions) => runTestFile(options, file, runOptions?.replace),
  };
  const outcomes: CheckOutcome[] = [];
  for (const check of due) {
    const { step: at, name, hint, readsStyles } = check;
    const run = (readsStyles && styled[registered.indexOf(check)]?.run) || check.run;
    const outcome = failure
      ? { name, ok: false, error: `Fix this first: ${describeProblem(failure)}`, ms: 0 }
      : await runOne(name, () => run(context), options.timeoutMs ?? 5000);
    outcomes.push({ ...outcome, step: at, hint: outcome.ok ? undefined : hint });
  }
  return outcomes;
}
