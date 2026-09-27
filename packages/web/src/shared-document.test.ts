/**
 * Several apps on one page. Every engine listens on the one `document` - an island per region of
 * a web app, or the documentation site's three roots - so each has to act only for the nodes it
 * made, and stop listening once its app is gone.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { installJsdomEnvironment } from './jsdom-env.ts';

async function page() {
  const { document } = installJsdomEnvironment();
  const [{ mount }, { EventsApp }] = await Promise.all([
    import('./mount.ts'),
    import('./events-app.ts'),
  ]);
  const island = () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const mounted = mount(root, EventsApp);
    const app = mounted.componentRef.instance as InstanceType<typeof EventsApp>;
    // Not `#line`: every island has one, and jsdom answers an id selector from the first.
    const field = root.querySelector('[id="line"]') as HTMLTextAreaElement;
    return { ...mounted, root, app, field };
  };
  return { document, island };
}

describe('apps sharing a document', () => {
  it("tells a field's focus and blur to its own app, once, whatever else is on the page", async () => {
    const { island } = await page();
    const first = island();
    const second = island();
    island();

    second.field.focus();
    second.field.blur();
    second.applicationRef.tick();

    assert.deepEqual(second.app.events(), ['focus', 'endEditing', 'blur']);
    assert.deepEqual(first.app.events(), []);
  });

  it('stops listening to the document once its app is destroyed', async () => {
    const { document, island } = await page();
    const gone = island();
    const field = gone.field;
    gone.destroy();

    // Put back by hand, as a page holding on to the element might. A listener still on the
    // document would take the focus as its own field's.
    document.body.appendChild(field);
    field.focus();
    assert.equal(gone.engine.focused, null);
  });
});
