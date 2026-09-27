/**
 * The renderer's own cost, in Node, against a Fabric that does nothing.
 *
 * js-framework-benchmark's scenarios over the canary bench's tree (a view and a text per row), so
 * what is left in a profile is Angular, the adapter and the engine: nothing native, nothing the
 * React side would not also pay. The on-device comparison is `examples/canary/src/bench`.
 *
 *     pnpm bench                        every scenario
 *     pnpm bench create select          some of them
 *     VARIANT=floor pnpm bench          the same template over directives that do nothing
 *     PROFILE=/tmp/p pnpm bench create  a .cpuprofile of the measured step, per run
 *
 * The script runs V8 with its optimising tiers off. Hermes has no JIT, and with one V8 hides
 * exactly the costs that dominate on a device; interpreted, a Node figure is about a seventh of the
 * simulator's, and ranks the same way. `bench/release.mjs` turns `ngDevMode` off as a release
 * build does.
 */
import { Component, Directive, ElementRef, inject, signal } from '@angular/core';
import { writeFileSync } from 'node:fs';
import { Session } from 'node:inspector';
import { mount } from '@ng-native/platform';
import { claimHost, type FabricUIManager } from '@ng-native/fabric';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

interface Row {
  id: number;
  label: string;
}

const styles = {
  row: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
  label: { color: '#e5e5ea', fontSize: 12 },
};

const TEMPLATE = `
  <view>
    @for (row of rows(); track row.id) {
      <view [style]="row.id === selected() ? selectedStyle : styles.row"
        ><text [style]="styles.label">{{ row.label }}</text></view
      >
    }
  </view>
`;

class BenchBase {
  protected readonly styles = styles;
  protected readonly selectedStyle = { ...styles.row, backgroundColor: '#ff0000' };
  readonly rows = signal<Row[]>([]);
  readonly selected = signal(-1);
}

/** What ships: the primitives, with nothing but `[style]` bound. */
@Component({ selector: 'x-bench', imports: [Text, View], template: TEMPLATE })
class Shipped extends BenchBase {}

/** The floor: a directive that claims the element and has no inputs at all. */
@Directive({ selector: 'view, text' })
class Bare {
  constructor() {
    claimHost(inject(ElementRef).nativeElement);
  }
}
@Component({ selector: 'x-bench', imports: [Bare], template: TEMPLATE })
class Floor extends BenchBase {}

/** The same rows styled the way an app usually is: classes and a component stylesheet. */
@Component({
  selector: 'x-bench',
  imports: [Text, View],
  template: `
    <view class="list">
      @for (row of rows(); track row.id) {
        <view class="row" [class.selected]="row.id === selected()"
          ><text class="label">{{ row.label }}</text></view
        >
      }
    </view>
  `,
  styles: `
    .list {
      flex: 1;
      padding: 12px;
    }
    .row {
      padding: 6px 10px;
      border-radius: 8px;
      margin-bottom: 4px;
      background-color: #1c1c1e;
    }
    .row.selected {
      background-color: #ff0000;
    }
    .label {
      color: #e5e5ea;
      font-size: 12px;
    }
  `,
})
class Classes extends BenchBase {}

const VARIANTS = { shipped: Shipped, floor: Floor, classes: Classes };
const Bench = VARIANTS[(process.env['VARIANT'] ?? 'shipped') as keyof typeof VARIANTS];
type Bench = BenchBase;

/** Counts calls and nothing else, so the profile holds only our side of the seam. */
function nullFabric() {
  const calls: Record<string, number> = {};
  const count = (name: string) => (calls[name] = (calls[name] ?? 0) + 1);
  const fabric: FabricUIManager = {
    createNode: () => (count('create'), {}),
    cloneNodeWithNewChildren: () => (count('clone'), {}),
    cloneNodeWithNewProps: () => (count('clone'), {}),
    cloneNodeWithNewChildrenAndProps: () => (count('clone'), {}),
    appendChild: (parent) => parent,
    createChildSet: () => [],
    appendChildToSet: () => {},
    completeRoot: () => void count('commit'),
    registerEventHandler: () => {},
  };
  return { fabric, calls };
}

let nextId = 0;
const build = (count: number): Row[] =>
  Array.from({ length: count }, () => ({ id: nextId++, label: `row ${nextId}` }));

type Step = (bench: Bench) => void;
interface Scenario {
  setup?: Step;
  run: Step;
}

const SCENARIOS: Record<string, Scenario> = {
  create: { run: (b) => b.rows.set(build(1000)) },
  replace: { setup: (b) => b.rows.set(build(1000)), run: (b) => b.rows.set(build(1000)) },
  update: {
    setup: (b) => b.rows.set(build(1000)),
    run: (b) =>
      b.rows.update((rows) =>
        rows.map((row, i) => (i % 10 ? row : { ...row, label: row.label + ' !!!' })),
      ),
  },
  select: { setup: (b) => b.rows.set(build(1000)), run: (b) => b.selected.set(b.rows()[500]!.id) },
  swap: {
    setup: (b) => b.rows.set(build(1000)),
    run: (b) =>
      b.rows.update((rows) => {
        const next = rows.slice();
        [next[1], next[998]] = [next[998]!, next[1]!];
        return next;
      }),
  },
  remove: {
    setup: (b) => b.rows.set(build(1000)),
    run: (b) => b.rows.update((rows) => rows.filter((_, i) => i !== 500)),
  },
  append: {
    setup: (b) => b.rows.set(build(1000)),
    run: (b) => b.rows.update((rows) => [...rows, ...build(1000)]),
  },
  clear: { setup: (b) => b.rows.set(build(1000)), run: (b) => b.rows.set([]) },
  // A keystroke's worth of change: one label, nothing structural.
  'one-label': {
    setup: (b) => b.rows.set(build(1000)),
    run: (b) =>
      b.rows.update((rows) => rows.map((row, i) => (i === 500 ? { ...row, label: 'x' } : row))),
  },
};

/**
 * `PROFILE=dir` profiles the measured step alone, one file per run, leaving out the setup that
 * would otherwise dominate a profile of the whole process.
 */
const PROFILE = process.env['PROFILE'];
let profiles = 0;
const profiler = PROFILE ? new Session() : null;
profiler?.connect();
profiler?.post('Profiler.enable');
profiler?.post('Profiler.setSamplingInterval', { interval: 50 });

/** One app per scenario, emptied between runs: an app per run leaks its environment injector. */
function once(app: ReturnType<typeof mount>, calls: Record<string, number>, name: string) {
  const bench = app.componentRef.instance as Bench;
  bench.rows.set([]);
  bench.selected.set(-1);
  app.applicationRef.tick();
  const scenario = SCENARIOS[name]!;
  if (scenario.setup) {
    scenario.setup(bench);
    app.applicationRef.tick();
  }
  for (const key of Object.keys(calls)) delete calls[key];
  profiler?.post('Profiler.start');
  const started = performance.now();
  scenario.run(bench);
  app.applicationRef.tick();
  const ms = performance.now() - started;
  profiler?.post('Profiler.stop', (error, result) => {
    if (!error)
      writeFileSync(`${PROFILE}/${name}-${profiles++}.cpuprofile`, JSON.stringify(result.profile));
  });
  return { ms, calls: { ...calls } };
}

const WARMUP = 5;
const RUNS = Number(process.env['RUNS'] ?? 15);
const only = process.argv.slice(2);

// The compiler attaches a component's stylesheet at the end of its module, which in an app is a
// module of its own. Here the components share this one, so the runs wait for all of it to have
// evaluated - after it, not at a top-level `await`, which would pause it before that line.
setTimeout(() => {
  for (const name of only.length ? only : Object.keys(SCENARIOS)) {
    const { fabric, calls } = nullFabric();
    const app = mount(1, Bench, fabric);
    for (let i = 0; i < WARMUP; i++) once(app, calls, name);
    const times: number[] = [];
    let last = {};
    for (let i = 0; i < RUNS; i++) {
      const { ms, calls: seen } = once(app, calls, name);
      times.push(ms);
      last = seen;
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)]!;
    console.log(
      `${name.padEnd(10)} median ${median.toFixed(2).padStart(7)}ms  min ${times[0]!.toFixed(2).padStart(7)}ms  ${JSON.stringify(last)}`,
    );
  }
});
