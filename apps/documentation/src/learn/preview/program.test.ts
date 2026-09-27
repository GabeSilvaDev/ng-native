import '@angular/compiler';
import * as core from '@angular/core';
import * as components from '@ng-native/components';
import { cleanup, render, screen, userEvent } from '@ng-native/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { compileTemplates, createProgram, ProblemError, type Problem } from './program.ts';

const libraries = { '@angular/core': core, '@ng-native/components': components };

const ROW = `import { Component, input, output } from '@angular/core';
import { Pressable, Text } from '@ng-native/components';

@Component({
  selector: 'habit-row',
  imports: [Pressable, Text],
  template: \`
    <pressable accessibilityRole="button" (press)="toggle.emit()">
      <text>{{ name() }}{{ done() ? ' (done)' : '' }}</text>
    </pressable>
  \`,
})
export class HabitRow {
  readonly name = input.required<string>();
  readonly done = input(false);
  readonly toggle = output<void>();
}
`;

const APP = `import { Component, computed, signal } from '@angular/core';
import { Text, View } from '@ng-native/components';
import { HabitRow } from './habit-row';

@Component({
  selector: 'app-root',
  imports: [HabitRow, Text, View],
  template: \`
    <view>
      <text>{{ done() }} done</text>
      @for (habit of habits(); track habit.name) {
        <habit-row [name]="habit.name" [done]="habit.done" (toggle)="flip(habit.name)" />
      }
    </view>
  \`,
})
export class App {
  protected readonly habits = signal([{ name: 'Walk', done: false }, { name: 'Read', done: true }]);
  protected readonly done = computed(() => this.habits().filter((h) => h.done).length);

  protected flip(name: string): void {
    this.habits.update((list) => list.map((h) => (h.name === name ? { ...h, done: !h.done } : h)));
  }
}
`;

function problemOf(run: () => void): Problem {
  try {
    run();
  } catch (error) {
    if (error instanceof ProblemError) return error.problem;
    throw error;
  }
  throw new Error('Expected a problem');
}

describe('createProgram', () => {
  afterEach(() => cleanup());

  it('compiles two files that import each other and renders them with signal inputs and outputs', async () => {
    const program = createProgram({ files: { 'app.ts': APP, 'habit-row.ts': ROW }, libraries });
    const { App } = program.load('app.ts') as { App: core.Type<unknown> };
    compileTemplates(program);

    await render(App);
    expect(screen.getByText('1 done')).toBeTruthy();
    await userEvent.press(screen.getByText('Walk'));
    expect(screen.getByText('2 done')).toBeTruthy();
    expect(screen.getByText('Walk (done)')).toBeTruthy();
  });

  it('reports a template error at its line in the file', () => {
    const broken = APP.replace('<text>{{ done() }} done</text>', '<text>{{ done() }} done</view>');
    const program = createProgram({ files: { 'app.ts': broken, 'habit-row.ts': ROW }, libraries });
    program.load('app.ts');
    const problem = problemOf(() => compileTemplates(program));
    expect(problem).toMatchObject({ kind: 'template', file: 'app.ts', line: 10 });
    expect(problem.message).toMatch(/view/);
  });

  it('reports a syntax error with its file and line', () => {
    const program = createProgram({
      files: { 'app.ts': APP, 'habit-row.ts': ROW.replace('output<void>();', 'output<void>(;') },
      libraries,
    });
    expect(problemOf(() => program.load('app.ts'))).toMatchObject({
      kind: 'syntax',
      file: 'habit-row.ts',
      line: 16,
    });
  });

  it('names the files there are when an import finds nothing', () => {
    const program = createProgram({ files: { 'app.ts': APP }, libraries });
    const problem = problemOf(() => program.load('app.ts'));
    expect(problem.kind).toBe('import');
    expect(problem.message).toBe('Cannot find "./habit-row". The files here are app.ts.');
  });

  it('says which packages there are when a package is not one of them', () => {
    const program = createProgram({
      files: { 'app.ts': "import _ from 'lodash';\nexport const x = _;" },
      libraries,
    });
    expect(problemOf(() => program.load('app.ts')).message).toBe(
      '"lodash" is not available here. You can import from @angular/core, @ng-native/components.',
    );
  });

  it('reports an error thrown while a file runs, at its line', () => {
    const program = createProgram({
      files: { 'app.ts': 'const a = 1;\nconst b = (undefined as any).x;\n' },
      libraries,
    });
    expect(problemOf(() => program.load('app.ts'))).toMatchObject({
      kind: 'runtime',
      file: 'app.ts',
      line: 2,
    });
  });

  it('stops a loop that never ends', () => {
    const program = createProgram({
      files: { 'app.ts': 'let n = 0;\nwhile (true) { n++; }\n' },
      libraries,
      loopBudgetMs: 50,
    });
    const problem = problemOf(() => program.load('app.ts'));
    expect(problem.message).toMatch(/A loop ran for more than 0.05 seconds/);
    expect(problem.line).toBe(2);
  });

  it('answers an import with an override instead of compiling the file', () => {
    const program = createProgram({
      files: {
        'app.ts': "import { name } from './habit-row';\nexport const greeting = 'hi ' + name;",
      },
      libraries,
      overrides: { 'habit-row.ts': { name: 'Ada' } },
    });
    expect(program.load('app.ts')['greeting']).toBe('hi Ada');
  });
});
