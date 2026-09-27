/**
 * The web half of `<dom-component>`: an Angular DOM component, mounted in the page a native web
 * view loaded, and talking to the app across the bridge.
 *
 * The native side is stood in for by what a web view puts on `window`: the JSON it injected
 * before the page loaded (`injectedObjectJson`), and `postMessage` for anything going back. Inputs
 * arrive as JSON, outputs leave as JSON, and nothing else crosses.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { installJsdomEnvironment } from './jsdom-env.ts';

interface Bridge {
  receive(message: unknown): void;
}

async function boot(inputs: Record<string, unknown> = { label: 'Draft' }) {
  const { document, window } = installJsdomEnvironment();
  const posted: { type: string; [key: string]: unknown }[] = [];
  (window as unknown as Record<string, unknown>)['ReactNativeWebView'] = {
    injectedObjectJson: () => JSON.stringify({ inputs }),
    postMessage: (data: string) => posted.push(JSON.parse(data)),
  };
  const [{ mountInWebView }, { Note }] = await Promise.all([
    import('./web-view.ts'),
    import('./web-view-app.ts'),
  ]);
  const ref = await mountInWebView(Note).mounted!;
  const bridge = (window as unknown as { __ngNative: Bridge }).__ngNative;
  const { ApplicationRef } = await import('@angular/core');
  const settle = () => ref.injector.get(ApplicationRef).whenStable();
  return { document, window, posted, ref, bridge, settle };
}

const click = (document: Document, id: string) =>
  document.getElementById(id)!.dispatchEvent(new (document.defaultView as any).MouseEvent('click'));

afterEach(async () => {
  const { destroyPlatform } = await import('@angular/core');
  destroyPlatform();
});

describe('a DOM component in a web view', () => {
  it('mounts into a root of its own, with the inputs the app injected before it loaded', async () => {
    const { document } = await boot();
    const root = document.querySelector('ng-native-web-root');
    assert.ok(root?.contains(document.getElementById('label')), 'inside its own root');
    assert.equal(
      document.body.style.margin,
      '0px',
      "and the page is the component's, edge to edge",
    );
    assert.equal(document.getElementById('label')!.textContent, 'Draft');
  });

  it("applies the browser's CSS, as a web app would", async () => {
    const { document } = await boot();
    const css = [...document.head.querySelectorAll('style')].map((s) => s.textContent).join('');
    assert.match(css, /resize:\s*vertical/);
  });

  it('says it is ready, and which outputs it has, once it is mounted', async () => {
    const { posted } = await boot();
    assert.deepEqual(posted[0], { type: 'ready', outputs: ['textChange', 'sent'] });
  });

  it('takes changed inputs from the app, without remounting', async () => {
    const { document, bridge, ref, settle } = await boot();
    const before = ref.instance;
    bridge.receive({ type: 'inputs', inputs: { label: 'Final', text: 'Hello' } });
    await settle();
    assert.equal(document.getElementById('label')!.textContent, 'Final');
    assert.equal((document.getElementById('text') as HTMLTextAreaElement).value, 'Hello');
    assert.equal(ref.instance, before);
  });

  it('sends each output to the app, as JSON', async () => {
    const { document, posted, bridge, settle } = await boot();
    bridge.receive({ type: 'inputs', inputs: { text: 'Hi' } });
    await settle();
    click(document, 'send');
    assert.deepEqual(posted.at(-1), { type: 'output', name: 'sent', value: 'Hi' });
  });

  it("sends a model's changes, so the app can bind it both ways", async () => {
    const { document, window, posted } = await boot();
    const text = document.getElementById('text') as HTMLTextAreaElement;
    text.value = 'typed';
    text.dispatchEvent(new (window as any).Event('input'));
    assert.deepEqual(posted.at(-1), { type: 'output', name: 'textChange', value: 'typed' });
  });

  it('reports its errors to the app, where someone will see them', async () => {
    // A web view's console is in Safari's inspector, not the terminal the app logs to.
    const { document, posted, settle } = await boot();
    click(document, 'fail');
    await settle();
    const error = posted.find((message) => message.type === 'error');
    assert.match(String(error?.['message']), /the note failed/);
  });
});
