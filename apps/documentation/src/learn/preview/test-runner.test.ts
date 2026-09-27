import '@angular/compiler';
import * as core from '@angular/core';
import * as components from '@ng-native/components';
import * as testing from '@ng-native/testing';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { runChecks, runTestFile } from './test-runner.ts';
import { vitest } from './vitest-api.ts';

const { compileCss } = createRequire(import.meta.url)('@ng-native/metro/css/compile.cjs') as {
  compileCss: (css: string, context: string) => object;
};

const libraries = {
  '@angular/core': core,
  '@ng-native/components': components,
  '@ng-native/testing': testing,
  vitest,
};

const APP = `import { Component, signal } from '@angular/core';
import { Pressable, Text } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Pressable, Text],
  template: \`
    <pressable accessibilityRole="button" (press)="count.set(count() + 1)">
      <text>{{ count() }} presses</text>
    </pressable>
  \`,
})
export class App {
  protected readonly count = signal(0);
}
`;

const SPEC = `import { render, screen, userEvent } from '@ng-native/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

describe('App', () => {
  let calls = 0;
  beforeEach(() => { calls++; });

  it('starts at zero', async () => {
    await render(App);
    expect(screen.getByText('0 presses')).toBeTruthy();
  });

  it('counts a press', async () => {
    await render(App);
    await userEvent.press(screen.getByRole('button'));
    expect(screen.getByText('1 presses')).toBeTruthy();
    expect(calls).toBe(2);
  });

  it('fails where it is wrong', async () => {
    await render(App);
    expect(screen.queryByText('9 presses')).not.toBeNull();
  });
});
`;

const CHECKS = `import { render, screen } from '@ng-native/testing';
import { expect } from 'vitest';
import { check } from '../../check.ts';
import { App } from './solution/app.ts';

check(1, 'Shows the count', async () => {
  await render(App);
  expect(screen.getByText('0 presses')).toBeTruthy();
});

check(1, 'Uses a signal', ({ file }) => {
  expect(file('app.ts')).toContain('signal(');
});

check(2, 'Says hello', async () => {
  await render(App);
  expect(screen.getByText('Hello')).toBeTruthy();
}, 'Add a text that says Hello.');

check(3, 'Not yet', () => {});
`;

describe('runTestFile', () => {
  it('runs each test in a learner test file and reports where one failed', async () => {
    const outcomes = await runTestFile(
      { files: { 'app.ts': APP, 'app.spec.ts': SPEC }, libraries },
      'app.spec.ts',
    );
    expect(outcomes.map(({ name, ok }) => ({ name, ok }))).toEqual([
      { name: 'App > starts at zero', ok: true },
      { name: 'App > counts a press', ok: true },
      { name: 'App > fails where it is wrong', ok: false },
    ]);
    expect(outcomes[2]).toMatchObject({
      error: 'Expected not null to be null',
      file: 'app.spec.ts',
      line: 23,
    });
  });

  it('says so when a test file has nothing in it', async () => {
    const outcomes = await runTestFile({ files: { 'app.spec.ts': '' }, libraries }, 'app.spec.ts');
    expect(outcomes).toMatchObject([{ ok: false, error: 'app.spec.ts has no tests in it yet.' }]);
  });
});

describe('runChecks', () => {
  it('runs the checks up to the step, with the hint on a failure', async () => {
    const outcomes = await runChecks({ files: { 'app.ts': APP }, libraries }, CHECKS, 2);
    expect(outcomes.map(({ name, ok, step, hint }) => ({ name, ok, step, hint }))).toEqual([
      { name: 'Shows the count', ok: true, step: 1, hint: undefined },
      { name: 'Uses a signal', ok: true, step: 1, hint: undefined },
      { name: 'Says hello', ok: false, step: 2, hint: 'Add a text that says Hello.' },
    ]);
  });

  it('fails every check with the problem when the learner code does not compile', async () => {
    const outcomes = await runChecks(
      { files: { 'app.ts': APP.replace('signal(0);', 'signal(0;') }, libraries },
      CHECKS,
      1,
    );
    expect(outcomes).toHaveLength(2);
    expect(outcomes.every((outcome) => !outcome.ok)).toBe(true);
    expect(outcomes[0]!.error).toMatch(/^Fix this first: app\.ts:14: /);
  });

  it('asks for native styles only for a check that reads them, and only runs that one with them', async () => {
    const checks = `import { render, screen } from '@ng-native/testing';
import { expect } from 'vitest';
import { check } from '../../check.ts';
import { App } from './solution/app.ts';

check(1, 'Reads text', async () => {
  await render(App);
  expect(screen.getByText('0 presses').props['color']).toBeUndefined();
});

check(1, 'Reads a style', async () => {
  await render(App);
  expect(screen.getByText('0 presses').props['color']).toBe('rgb(255, 0, 0)');
}, undefined, { readsStyles: true });
`;
    let asked = 0;
    const sheet = compileCss('text { color: red; }', 'test');
    const render: typeof testing.render = (component, options = {}) =>
      testing.render(component, { globalStyles: sheet as never, ...options });
    const nativeStyles = async () => {
      asked++;
      return {
        libraries: { '@ng-native/testing': { ...testing, render } },
        prepare: async () => {},
      };
    };
    const files = { 'app.ts': APP };
    expect(await runChecks({ files, libraries, nativeStyles }, checks, 1)).toMatchObject([
      { name: 'Reads text', ok: true },
      { name: 'Reads a style', ok: true },
    ]);
    expect(asked).toBe(1);

    asked = 0;
    await runChecks({ files, libraries, nativeStyles }, CHECKS, 3);
    expect(asked).toBe(0);
  });

  it('fails only the checks about a file the learner has not written', async () => {
    const checks = `import { render, screen } from '@ng-native/testing';
import { expect } from 'vitest';
import { check } from '../../check.ts';
import { App } from './solution/app.ts';
import { Later } from './solution/later.ts';

check(1, 'Shows the count', async () => {
  await render(App);
  expect(screen.getByText('0 presses')).toBeTruthy();
});

check(1, 'Has Later', () => {
  expect(Later).toBeDefined();
});
`;
    const outcomes = await runChecks({ files: { 'app.ts': APP }, libraries }, checks, 1);
    expect(outcomes.map(({ name, ok }) => ({ name, ok }))).toEqual([
      { name: 'Shows the count', ok: true },
      { name: 'Has Later', ok: false },
    ]);
  });

  it('can run the learner tests against a component of its own', async () => {
    const checks = `import { Component } from '@angular/core';
import { Text } from '@ng-native/components';
import { expect } from 'vitest';
import { check } from '../../check.ts';

@Component({ selector: 'app-root', imports: [Text], template: '<text>5 presses</text>' })
class Broken {}

check(1, 'The tests notice a broken count', async ({ runTests }) => {
  const outcomes = await runTests('app.spec.ts', { replace: { 'app.ts': { App: Broken } } });
  expect(outcomes.some((outcome) => !outcome.ok)).toBe(true);
});
`;
    const outcomes = await runChecks(
      { files: { 'app.ts': APP, 'app.spec.ts': SPEC }, libraries },
      checks,
      1,
    );
    expect(outcomes).toMatchObject([{ ok: true }]);
  });
});
