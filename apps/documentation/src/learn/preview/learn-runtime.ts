/**
 * `ɵlearn`: what the code `lower-source.ts` writes calls at run time.
 *
 * `decorate` and `member` apply decorators the way TypeScript's own lowering does. `signals`
 * writes the metadata the JIT compiler reads for `input()`, `model()`, `output()` and the signal
 * queries, which is what the Angular CLI's JIT transform writes as decorators. `guard` is the
 * loop watchdog.
 */
import {
  ContentChild,
  ContentChildren,
  Input,
  Output,
  ViewChild,
  ViewChildren,
  type Type,
} from '@angular/core';

/** `[fn, field, required, alias]` for an input, model or output; `[fn, field, required, args]` for a query. */
export type SignalMember = readonly [string, string, boolean, unknown];

export interface LearnRuntime {
  decorate(type: Type<unknown>, decorators: readonly ((type: Type<unknown>) => unknown)[]): void;
  member(
    type: Type<unknown>,
    field: string,
    isStatic: boolean,
    decorators: readonly ((target: object, field: string) => void)[],
  ): void;
  signals(type: Type<unknown>, members: readonly SignalMember[]): void;
  guard(): boolean;
}

/** Thrown by `guard()` when one task has spent too long going round loops. */
export class RunawayLoop extends Error {
  constructor(seconds: number) {
    super(
      `A loop ran for more than ${seconds} seconds without finishing, so it was stopped. ` +
        'Check that its condition becomes false.',
    );
    this.name = 'RunawayLoop';
  }
}

type QueryDecorator = (locator: unknown, options: object) => PropertyDecorator;

const QUERIES: Record<string, QueryDecorator> = {
  viewChild: ViewChild as unknown as QueryDecorator,
  viewChildren: ViewChildren as unknown as QueryDecorator,
  contentChild: ContentChild as unknown as QueryDecorator,
  contentChildren: ContentChildren as unknown as QueryDecorator,
};

function applySignalMember(prototype: object, [fn, field, required, extra]: SignalMember): void {
  if (fn === 'input' || fn === 'model') {
    const alias = (extra as string | null) ?? field;
    const options = { isSignal: true, alias, required, transform: undefined };
    Input(options as never)(prototype, field);
    if (fn === 'model') Output(`${alias}Change`)(prototype, field);
    return;
  }
  if (fn === 'output') {
    Output((extra as string | null) ?? field)(prototype, field);
    return;
  }
  const [locator, options] = extra as [unknown, object?];
  QUERIES[fn]!(locator, { ...options, isSignal: true })(prototype, field);
}

/**
 * Give a JIT-compiled component the schemas an ahead-of-time one has: none.
 *
 * A standalone component compiled just in time gets `schemas: []`, which turns on Angular's
 * unknown element and unknown property checks, and against a phone's elements every one of them
 * is wrong: `accessibilityState` is not a property of anything a browser knows. A device build is
 * compiled ahead of time, where `schemas` is `null` and the checks never run, so the preview
 * matches it. The definition is compiled when first read, so the getter is wrapped.
 */
function withoutSchemas(type: Type<unknown>): void {
  const descriptor = Object.getOwnPropertyDescriptor(type, 'ɵcmp');
  const read = descriptor?.get;
  if (!read || !descriptor.configurable) return;
  Object.defineProperty(type, 'ɵcmp', {
    ...descriptor,
    get() {
      const def = read.call(type) as { schemas: unknown } | undefined;
      if (def) def.schemas = null;
      return def;
    },
  });
}

export interface RuntimeOptions {
  /** Called with each class a decorator was applied to, in the order the file declares them. */
  readonly onClass?: (type: Type<unknown>) => void;
  /** How long one task may spend in loops before `guard()` stops it. */
  readonly loopBudgetMs?: number;
}

export function createRuntime(options: RuntimeOptions = {}): LearnRuntime {
  const budget = options.loopBudgetMs ?? 2000;
  let started: number | undefined;
  let passes = 0;
  return {
    decorate(type, decorators) {
      for (const decorator of [...decorators].reverse()) decorator(type);
      withoutSchemas(type);
      options.onClass?.(type);
    },
    member(type, field, isStatic, decorators) {
      const target = isStatic ? type : (type.prototype as object);
      for (const decorator of [...decorators].reverse()) decorator(target, field);
    },
    signals(type, members) {
      for (const member of members) applySignalMember(type.prototype as object, member);
    },
    guard() {
      if (started === undefined) {
        // The first pass in a task starts the clock, and the next task stops it. A loop that
        // never lets the task end never lets the clock stop.
        started = performance.now();
        setTimeout(() => (started = undefined));
        return true;
      }
      if (++passes % 1000 === 0 && performance.now() - started > budget) {
        started = undefined;
        throw new RunawayLoop(budget / 1000);
      }
      return true;
    },
  };
}
