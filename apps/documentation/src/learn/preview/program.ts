/**
 * A learner's files, compiled and linked in the page.
 *
 * Each file goes through `lower-source.ts`, then sucrase strips its types and turns its imports
 * into `require` calls, then it runs in a `Function` whose `require` answers with the modules the
 * page already has: `@angular/core` and the real, ahead-of-time compiled `@ng-native/components`,
 * and the learner's other files, compiled the same way the first time something imports them.
 *
 * `compileTemplates` then reads each component's `ɵcmp`, which is the moment Angular's JIT
 * compiler compiles its template, so a template error is reported against the file and line it
 * came from rather than surfacing later as a blank phone.
 */
import type { Type } from '@angular/core';
import { transform } from 'sucrase';
import { createRuntime, type LearnRuntime } from './learn-runtime.ts';
import { lowerSource, RUNTIME, SourceProblem, type LoweredSource } from './lower-source.ts';

export type ProblemKind =
  'syntax' | 'import' | 'template' | 'runtime' | 'css' | 'device' | 'console';

export interface Problem {
  readonly kind: ProblemKind;
  readonly message: string;
  readonly file?: string;
  /** 1-based. */
  readonly line?: number;
  /** 0-based. */
  readonly column?: number;
}

export class ProblemError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.message);
    this.problem = problem;
  }
}

export interface CompiledFile {
  readonly file: string;
  readonly exports: Record<string, unknown>;
  readonly lowered: LoweredSource;
  /** Every class in the file a decorator was applied to, exported or not. */
  readonly classes: Type<unknown>[];
}

export interface ProgramOptions {
  /** The learner's files, by name: `app.ts`, `habit-row.ts`. */
  readonly files: Readonly<Record<string, string>>;
  /** Packages a file may import, by specifier. */
  readonly libraries: Readonly<Record<string, unknown>>;
  /** Files answered with a module object instead of being compiled, by name. */
  readonly overrides?: Readonly<Record<string, Record<string, unknown>>>;
  /**
   * A file whose imports of files the learner has not written get an empty module rather than an
   * error. A lesson's checks import every file of its solution, and a check about a file that is
   * not there yet should fail on its own, not take the checks about the other files with it.
   */
  readonly missingIsEmptyIn?: string;
  readonly loopBudgetMs?: number;
}

export interface Program {
  /** A file's exports, compiling it and whatever it imports on first use. */
  load(file: string): Record<string, unknown>;
  /** Every file compiled so far. */
  readonly compiled: ReadonlyMap<string, CompiledFile>;
}

const SOURCE_URL = 'learn:///';

/** `./habit-row`, `./habit-row.ts` and `../solution/habit-row.ts` all name `habit-row.ts`. */
export function fileFor(specifier: string): string {
  const base = specifier.split('/').pop() ?? specifier;
  return base.endsWith('.ts') ? base : `${base}.ts`;
}

export function createProgram(options: ProgramOptions): Program {
  const compiled = new Map<string, CompiledFile>();
  const loading = new Map<string, Record<string, unknown>>();

  const load = (file: string): Record<string, unknown> => {
    const override = options.overrides?.[file];
    if (override) return override;
    // A file still being evaluated answers with what it has exported so far, as CommonJS does
    // for a cycle.
    const done = compiled.get(file)?.exports ?? loading.get(file);
    if (done) return done;
    const source = options.files[file];
    if (source === undefined)
      throw new ProblemError({ kind: 'import', message: `There is no file called ${file}.` });
    const exports: Record<string, unknown> = {};
    loading.set(file, exports);
    try {
      compiled.set(file, evaluate(file, source, exports));
    } finally {
      loading.delete(file);
    }
    return exports;
  };

  const requireFrom =
    (from: string) =>
    (specifier: string): unknown => {
      if (specifier in options.libraries) return options.libraries[specifier];
      if (specifier.startsWith('.')) {
        const file = fileFor(specifier);
        if (file in options.files || options.overrides?.[file]) return load(file);
        if (from === options.missingIsEmptyIn) return {};
        throw new ProblemError({
          kind: 'import',
          file: from,
          message: `Cannot find "${specifier}". The files here are ${Object.keys(options.files).join(', ')}.`,
        });
      }
      throw new ProblemError({
        kind: 'import',
        file: from,
        message: `"${specifier}" is not available here. You can import from ${Object.keys(options.libraries).join(', ')}.`,
      });
    };

  const evaluate = (
    file: string,
    source: string,
    exports: Record<string, unknown>,
  ): CompiledFile => {
    const lowered = lower(file, source);
    const code = strip(file, lowered.code);
    const classes: Type<unknown>[] = [];
    const runtime: LearnRuntime = createRuntime({
      onClass: (type) => classes.push(type),
      loopBudgetMs: options.loopBudgetMs,
    });
    const module = { exports };
    try {
      new Function(
        'require',
        'module',
        'exports',
        RUNTIME,
        `${code}\n//# sourceURL=${SOURCE_URL}${file}`,
      )(requireFrom(file), module, exports, runtime);
    } catch (error) {
      throw error instanceof ProblemError ? error : new ProblemError(runtimeProblem(error, file));
    }
    return { file, exports: module.exports, lowered, classes };
  };

  return { load, compiled };
}

function lower(file: string, source: string): LoweredSource {
  try {
    return lowerSource(source);
  } catch (error) {
    if (!(error instanceof SourceProblem)) throw error;
    throw new ProblemError({ kind: 'syntax', file, message: error.message, ...error.at });
  }
}

function strip(file: string, code: string): string {
  try {
    return transform(code, {
      transforms: ['typescript', 'imports'],
      disableESTransforms: true,
      filePath: file,
    }).code;
  } catch (error) {
    const loc = (error as { loc?: { line: number; column: number } }).loc;
    throw new ProblemError({
      kind: 'syntax',
      file,
      message: (error as Error).message.replace(/\s*\(\d+:\d+\)$/, ''),
      line: loc?.line,
      column: loc && loc.column - 1,
    });
  }
}

/**
 * How many lines `new Function` puts in front of the body, measured rather than assumed: Chrome
 * and Firefox wrap it in `function anonymous(...) {` on lines of their own, and a line in a stack
 * trace has to have that taken off to be a line in the editor.
 */
let wrapperLines: number | undefined;

function measureWrapper(): number {
  try {
    new Function(`throw new Error('probe');\n//# sourceURL=${SOURCE_URL}probe`)();
  } catch (error) {
    const line = new RegExp(`${SOURCE_URL}probe:(\\d+)`).exec(String((error as Error).stack));
    return line ? Number(line[1]) - 1 : 0;
  }
  return 0;
}

/** The first place in the learner's own files an error's stack passes through. */
export function locate(error: unknown): { file: string; line: number; column: number } | undefined {
  const stack = String((error as Error | undefined)?.stack ?? '');
  const at = /learn:\/\/\/([\w.-]+\.ts):(\d+):(\d+)/.exec(stack);
  if (!at) return undefined;
  wrapperLines ??= measureWrapper();
  return { file: at[1]!, line: Number(at[2]) - wrapperLines, column: Number(at[3]) - 1 };
}

export function runtimeProblem(error: unknown, file?: string): Problem {
  const where = locate(error);
  const message = error instanceof Error ? error.message : String(error);
  return {
    kind: 'runtime',
    message,
    file: where?.file ?? file,
    line: where?.line,
    column: where?.column,
  };
}

/** The component definitions a JIT compile has to produce, read to make it happen. */
const DEFINITIONS = ['ɵcmp', 'ɵdir', 'ɵpipe'];

/**
 * Compile every template in every file now. A child's is otherwise only compiled when a parent
 * first renders it, inside `mount`, too late to say which template was wrong.
 */
export function compileTemplates(program: Program): void {
  for (const { file, classes, lowered } of program.compiled.values()) {
    for (const type of classes) {
      try {
        for (const key of DEFINITIONS)
          if (key in type) void (type as unknown as Record<string, unknown>)[key];
      } catch (error) {
        throw new ProblemError(templateProblem(error, file, type.name, lowered));
      }
    }
  }
}

/**
 * Angular ends a template error with `ng:///App/template.html@3:10`, counted from the start of
 * the template; the template's own place in the file turns that into a line of the file.
 */
export function templateProblem(
  error: unknown,
  file: string,
  className: string,
  lowered: LoweredSource,
): Problem {
  const message = error instanceof Error ? error.message : String(error);
  const at = /template\.html@(\d+):(\d+)/.exec(message);
  const start = lowered.templates[className];
  const cleaned = message
    .replace(/^NG\d+: /, '')
    .replace(/^Errors during JIT compilation of template for \w+: /, '')
    .replace(/\s*\("[\s\S]*?\): ng:\/\/\/\S+$/gm, '')
    .trim();
  if (!at || !start) return { kind: 'template', file, message: cleaned };
  const line = Number(at[1]);
  const column = Number(at[2]);
  return {
    kind: 'template',
    file,
    message: cleaned,
    line: start.line + line,
    column: line === 0 ? start.column + column : column,
  };
}
