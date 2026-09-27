/**
 * The web counterpart to `packages/integration-tests/unbound-directive-input.test.ts`: a forms
 * directive input reaching `BrowserRenderer.setProperty` because its directive was never imported
 * is reported here too, from the table `@ng-native/fabric`'s `forms-inputs.ts` shares with the
 * native adapter.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { installJsdomEnvironment } from './jsdom-env.ts';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function capture(run: () => Promise<void>): Promise<string[]> {
  const reports: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => reports.push(args.map(String).join(' '));
  try {
    await run();
  } finally {
    console.error = original;
  }
  return reports;
}

async function mountFixture(
  componentName: 'SignalFormApp' | 'ForgottenFormFieldApp',
): Promise<string[]> {
  return capture(async () => {
    const { document } = installJsdomEnvironment();
    const [{ mount }, mod] = await Promise.all([
      import('./mount.ts'),
      import('./forgotten-form-field-app.ts'),
    ]);
    const root = document.createElement('app-root');
    document.body.appendChild(root);
    const { componentRef } = mount(root, mod[componentName]);
    await settle();
    componentRef.destroy();
  });
}

describe('a forms directive input with no directive to take it, on the web', () => {
  it('names the directive to import, once per element name', async () => {
    const reports = await mountFixture('ForgottenFormFieldApp');
    assert.equal(reports.length, 2, reports.join('\n'));
    assert.match(reports[0]!, /'formField'.*<text-input>/);
    assert.match(reports[0]!, /FormField.*@angular\/forms\/signals/);
    assert.match(reports[1]!, /'formField'.*<switch>/);
  });

  it('says nothing when the directive is imported', async () => {
    assert.deepEqual(await mountFixture('SignalFormApp'), []);
  });

  it('says nothing once ngDevMode is off, as in a release build', async () => {
    const scope = globalThis as { ngDevMode?: unknown };
    const before = scope.ngDevMode;
    scope.ngDevMode = false;
    try {
      assert.deepEqual(await mountFixture('ForgottenFormFieldApp'), []);
    } finally {
      scope.ngDevMode = before;
    }
  });
});
