/**
 * What the tests actually reach, across every `node --test` suite at once.
 *
 * They run in different hosts and cover overlapping code, so a per-suite number answers the wrong
 * question. `packages/components` is exercised by the native suite through a fake Fabric and by the
 * web suite through jsdom, and neither on its own says whether a component is tested - only the
 * union does. So each writes lcov and this merges them on absolute paths before reporting.
 *
 * Node's own `--experimental-test-coverage` does the instrumenting. No `c8`, no `nyc`: both suites
 * are `node --test` already, and a separate instrumenter would mean a second set of source maps
 * over TypeScript that Node is stripping itself.
 *
 * `packages/web/browser` is not merged in. It is nine tests in Vitest's browser mode, which would
 * need `@vitest/coverage-v8` and a third instrumenter to report at all, and what it covers is
 * `packages/web` - the package these two already put at the top of the table. The nine exist to
 * prove things a real browser does and jsdom fakes; that is not a coverage question.
 *
 * Usage:
 *
 *   node scripts/coverage.mjs            # run every suite, merge, report
 *   node scripts/coverage.mjs --report   # re-report from the last run, without re-running
 *   node scripts/coverage.mjs --min 70   # exit non-zero if total line coverage is under 70%
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'coverage');

/**
 * Everything that is shipped, and nothing that is not.
 *
 * `.generated.ts` is deliberately *not* excluded, and leaving it out was this script's first and
 * worst bug: `node --test` cannot run Angular's JIT, so the native suite's fixtures are compiled
 * ahead of time and import the pre-compiled copy of every component. The source file is never
 * executed there at all. Excluding the copy therefore reported `virtual-list.ts` at 21.9% with
 * thirteen passing tests against it, when the code that actually ran was 98.6% covered - a report
 * that would have sent someone to write tests for the best-tested file in the package.
 *
 * `report()` folds each copy back onto the source it was generated from. Fixtures and tests stay
 * out: they are the instrument, not the thing measured.
 */
const EXCLUDE = ['**/*.test.ts', '**/fixtures/**', '**/node_modules/**', '**/dist/**'];

/**
 * How each suite is run and where it leaves its lcov.
 *
 * The `node --test` suites are instrumented by Node itself and take their flags here. The
 * browser suite is Vitest driving a real Chromium, so it is instrumented by `@vitest/coverage-v8`
 * and configured in `packages/web/vitest.config.ts`; all this has to do is ask for it and know
 * where the report lands.
 */
const SUITES = [
  {
    name: 'native',
    cwd: 'packages/integration-tests',
    command: 'node',
    args: (destination) => [
      '--import',
      './register-linker.mjs',
      '--test',
      // One file per core. Node's default leaves a core free, which on a two-core CI runner is
      // one file at a time, and this suite is 160 files.
      `--test-concurrency=${availableParallelism()}`,
      '--experimental-test-coverage',
      ...EXCLUDE.map((pattern) => `--test-coverage-exclude=${pattern}`),
      '--test-reporter=lcov',
      `--test-reporter-destination=${destination}`,
      '--test-reporter=dot',
      '--test-reporter-destination=stdout',
      '**/*.test.ts',
    ],
    report: (out) => path.join(out, 'native.info'),
  },
  {
    name: 'web',
    cwd: 'packages/web',
    command: 'node',
    args: (destination) => [
      '--import',
      './register-linker.mjs',
      '--test',
      '--experimental-test-coverage',
      ...EXCLUDE.map((pattern) => `--test-coverage-exclude=${pattern}`),
      '--test-reporter=lcov',
      `--test-reporter-destination=${destination}`,
      '--test-reporter=dot',
      '--test-reporter-destination=stdout',
      'src/*.test.ts',
    ],
    report: (out) => path.join(out, 'web.info'),
  },
  {
    // `@ng-native/testing`'s own node:test half, through the public register hook. Its Vitest half
    // runs the same code the way the tutorial does, so leaving it out loses nothing measurable.
    name: 'testing',
    cwd: 'packages/testing',
    command: 'node',
    args: (destination) => [
      '--import',
      './runner/register.mjs',
      '--test',
      '--experimental-test-coverage',
      ...EXCLUDE.map((pattern) => `--test-coverage-exclude=${pattern}`),
      '--test-reporter=lcov',
      `--test-reporter-destination=${destination}`,
      '--test-reporter=dot',
      '--test-reporter-destination=stdout',
      'src/**/*.node.test.ts',
    ],
    report: (out) => path.join(out, 'testing.info'),
  },
  {
    name: 'browser',
    cwd: 'packages/web',
    command: 'pnpm',
    args: () => ['exec', 'vitest', 'run', '--coverage'],
    report: (out) => path.join(out, 'browser', 'lcov.info'),
  },
];

/** `SF:` records, as `{ [file]: { lines: Map<number, hits>, branches: Map<id, hits> } }`. */
function parseLcov(text, cwd) {
  const files = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) {
      // lcov paths are relative to the suite's own directory; the merge key has to be absolute.
      const file = path.resolve(cwd, line.slice(3).trim());
      current = files.get(file) ?? { lines: new Map(), branches: new Map() };
      files.set(file, current);
    } else if (line.startsWith('DA:') && current) {
      const [number, hits] = line.slice(3).split(',').map(Number);
      current.lines.set(number, (current.lines.get(number) ?? 0) + hits);
    } else if (line.startsWith('BRDA:') && current) {
      const [number, block, branch, hits] = line.slice(5).split(',');
      const key = `${number}:${block}:${branch}`;
      const taken = hits === '-' ? 0 : Number(hits);
      current.branches.set(key, (current.branches.get(key) ?? 0) + taken);
    }
  }
  return files;
}

/** The lines a file never ran, collapsed into ranges, because a list of 200 numbers is unreadable. */
function uncoveredRanges(lines) {
  const missed = [...lines.entries()]
    .filter(([, hits]) => hits === 0)
    .map(([number]) => number)
    .sort((a, b) => a - b);
  const ranges = [];
  for (const number of missed) {
    const last = ranges.at(-1);
    if (last && number === last[1] + 1) last[1] = number;
    else ranges.push([number, number]);
  }
  return ranges.map(([from, to]) => (from === to ? `${from}` : `${from}-${to}`));
}

function run() {
  mkdirSync(OUT, { recursive: true });
  for (const suite of SUITES) {
    const result = spawnSync(suite.command, suite.args(suite.report(OUT)), {
      cwd: path.join(ROOT, suite.cwd),
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    if (result.status !== 0) {
      console.error(`\n${suite.name} suite failed; coverage from a red suite is not worth having.`);
      process.exit(result.status ?? 1);
    }
  }
}

/** How well one suite covered a file's branches, with "no branches recorded" as worst. */
function branchScore(branches) {
  if (branches.size === 0) return -1;
  return [...branches.values()].filter((hits) => hits > 0).length / branches.size;
}

/** A percentage, with an empty file counting as covered rather than as a division by zero. */
const ratio = (covered, total) => (total === 0 ? 100 : (covered / total) * 100);

/** Totals for one group of files. */
function totals(files) {
  return files.reduce(
    (sum, entry) => ({
      files: sum.files + 1,
      lines: sum.lines + entry.lines,
      covered: sum.covered + entry.covered,
      branches: sum.branches + entry.branches,
      branchesCovered: sum.branchesCovered + entry.branchesCovered,
    }),
    { files: 0, lines: 0, covered: 0, branches: 0, branchesCovered: 0 },
  );
}

const row = (name, data) =>
  `${name.padEnd(16)} ${String(data.files).padStart(5)} ${String(data.lines).padStart(7)} ` +
  `${ratio(data.covered, data.lines).toFixed(1).padStart(7)} ` +
  `${ratio(data.branchesCovered, data.branches).toFixed(1).padStart(9)}`;

/** Worst package first, so the table reads as a queue of work. */
function printPackages(shipped) {
  const groups = new Map();
  for (const entry of shipped) {
    groups.set(entry.package, [...(groups.get(entry.package) ?? []), entry]);
  }
  console.log(`\nCoverage by package (${SUITES.length} suites merged)\n`);
  console.log(
    `${'package'.padEnd(16)} ${'files'.padStart(5)} ${'lines'.padStart(7)} ` +
      `${'line %'.padStart(7)} ${'branch %'.padStart(9)}`,
  );
  console.log('-'.repeat(50));
  const rows = [...groups.entries()]
    .map(([name, files]) => [name, totals(files)])
    .sort((a, b) => ratio(a[1].covered, a[1].lines) - ratio(b[1].covered, b[1].lines));
  for (const [name, data] of rows) console.log(row(name, data));
  console.log('-'.repeat(50));
  console.log(row('all', totals(shipped)));
}

/**
 * Ranked by uncovered lines rather than by percentage.
 *
 * A forty-line file at 80% is noise beside a four-hundred-line file at 30%, and a list sorted by
 * percentage puts the noise first.
 */
function printWorst(shipped) {
  const worst = shipped
    .map((entry) => ({ ...entry, missing: entry.lines - entry.covered }))
    .filter((entry) => entry.missing > 0)
    .sort((a, b) => b.missing - a.missing)
    .slice(0, 30);
  console.log('\nMost uncovered lines\n');
  console.log(`${'file'.padEnd(52)} ${'miss'.padStart(5)} ${'line %'.padStart(7)}`);
  console.log('-'.repeat(68));
  for (const entry of worst) {
    console.log(
      `${entry.file.padEnd(52)} ${String(entry.missing).padStart(5)} ` +
        `${ratio(entry.covered, entry.lines).toFixed(1).padStart(7)}`,
    );
  }
}

/**
 * Every suite's hits, combined per file: lines added together, branches not.
 *
 * Lines are a true union. `packages/web/src/mount.ts` is run by the jsdom suite and again by the
 * browser one, and a line number means the same thing to both, so a line either suite reached is
 * covered.
 *
 * Branches are not, and adding them was wrong in a way that looked like a regression: Node's own
 * coverage and `@vitest/coverage-v8` identify a branch differently, so summing their `BRDA` keys
 * counts one instrumenter's *untaken* branches as branches the other never had. Adding the browser
 * suite that way dropped `packages/web` from 88% to 72% while covering strictly more code. So each
 * file keeps the branch set of whichever suite covered the largest share of it, which is a real
 * measurement by one instrumenter rather than an invented union of two.
 */
function mergeSuites() {
  const totals = new Map();
  for (const suite of SUITES) {
    const file = suite.report(OUT);
    if (!existsSync(file)) continue;
    for (const [name, data] of parseLcov(readFileSync(file, 'utf8'), path.join(ROOT, suite.cwd))) {
      const held = totals.get(name) ?? { lines: new Map(), branches: new Map() };
      for (const [number, hits] of data.lines) {
        held.lines.set(number, (held.lines.get(number) ?? 0) + hits);
      }
      // A file no suite recorded branches for scores below every real measurement, rather than
      // above them: `ratio(0, 0)` is 100 by design elsewhere, and an empty set winning that
      // comparison reported every package at 100% branch coverage.
      if (branchScore(data.branches) > branchScore(held.branches)) held.branches = data.branches;
      totals.set(name, held);
    }
  }
  return totals;
}

/** Every measured file, as plain counts. */
function filesIn(merged) {
  return [...merged.entries()]
    .filter(
      ([file]) =>
        file.startsWith(path.join(ROOT, 'packages')) && file.includes(`${path.sep}src${path.sep}`),
    )
    .map(([file, data]) => {
      const lines = [...data.lines.values()];
      const branches = [...data.branches.values()];
      return {
        file: path.relative(ROOT, file),
        package: path.relative(ROOT, file).split(path.sep)[1],
        lines: lines.length,
        covered: lines.filter((hits) => hits > 0).length,
        branches: branches.length,
        branchesCovered: branches.filter((hits) => hits > 0).length,
        uncovered: uncoveredRanges(data.lines),
      };
    });
}

/**
 * One row per source file, folding each AOT copy onto the source it came from.
 *
 * The suites run different copies: the native one executes `foo.generated.ts`, because its
 * fixtures are AOT-compiled and import that, and the web one executes `foo.ts` through jsdom. So a
 * component reached only by the native suite reads as untested unless the copy counts, and one
 * reached by both would be counted twice.
 *
 * Line numbers do not survive the compile - the template becomes instructions and everything below
 * shifts - so the two cannot be merged line by line. The better-covered of the pair is taken
 * instead, under the source's name, which is the honest reading of "did this logic run". Line
 * ranges then come from whichever copy won, so on an AOT-only file they are offsets into the
 * generated copy rather than the source. The ranking is what this report is for, and the ranking
 * is right either way.
 */
function fold(measured) {
  const bySource = new Map();
  for (const entry of measured) {
    const source = entry.file.replace(/\.generated\.ts$/, '.ts');
    const held = bySource.get(source);
    if (!held || ratio(entry.covered, entry.lines) > ratio(held.covered, held.lines)) {
      bySource.set(source, { ...entry, file: source });
    }
  }
  return [...bySource.values()];
}

function report(minimum) {
  const shipped = fold(filesIn(mergeSuites()));
  printPackages(shipped);
  printWorst(shipped);

  const all = totals(shipped);
  const overall = ratio(all.covered, all.lines);
  writeFileSync(
    path.join(OUT, 'summary.json'),
    `${JSON.stringify({ overall, files: shipped }, null, 2)}\n`,
  );
  console.log(`\nDetail in ${path.relative(ROOT, path.join(OUT, 'summary.json'))}`);

  if (minimum !== undefined && overall < minimum) {
    console.error(`\nLine coverage ${overall.toFixed(1)}% is under the ${minimum}% floor.`);
    process.exitCode = 1;
  }
}

const args = process.argv.slice(2);
const minimumAt = args.indexOf('--min');
const minimum = minimumAt === -1 ? undefined : Number(args[minimumAt + 1]);
if (!args.includes('--report')) run();
report(minimum);
