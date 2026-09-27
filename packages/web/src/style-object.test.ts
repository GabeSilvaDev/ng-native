/**
 * A whole style object set as the `style` prop, which is how `[animatedStyle]` writes every frame
 * and how swipe-refresh-layout positions its scroll view.
 *
 * Angular's own `[style]` bindings reach the renderer's `setStyle` one key at a time, so they
 * always worked. A `setProp(node, 'style', {...})` went through `applyProp` instead, which had no
 * handler for `style` and writes only strings, numbers and booleans as attributes - so the object
 * was dropped, and a fade or a slide-in stood still in a browser while it moved on a device.
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { installJsdomEnvironment } from './jsdom-env.ts';
import type { BrowserEngine as Engine } from './browser-engine.ts';

describe('a style object set as a prop', () => {
  let BrowserEngine: typeof Engine;
  let document: Document;
  before(async () => {
    ({ document } = installJsdomEnvironment());
    ({ BrowserEngine } = await import('./browser-engine.ts'));
  });

  const scene = () => {
    const engine = new BrowserEngine(document);
    const node = engine.createElementNode('view');
    return { engine, node, style: (node.el as HTMLElement).style };
  };

  it('writes every key, in CSS units, with a transform list as a CSS transform', () => {
    const { engine, node, style } = scene();
    engine.setProp(node, 'style', {
      opacity: 0.5,
      top: 12,
      backgroundColor: 'red',
      transform: [{ translateY: 10 }, { scale: 0.5 }, { rotate: '45deg' }],
    });
    assert.equal(style.opacity, '0.5');
    assert.equal(style.top, '12px');
    assert.equal(style.backgroundColor, 'red');
    assert.equal(style.transform, 'translateY(10px) scale(0.5) rotate(45deg)');
  });

  it('takes the keys the renderer mirrored, already dash-cased, alongside camel-cased ones', () => {
    // `[animatedStyle]` merges an animation frame into the object the renderer keeps in sync.
    const { engine, node, style } = scene();
    engine.setProp(node, 'style', { 'margin-top': 4, opacity: 1 });
    assert.equal(style.marginTop, '4px');
    assert.equal(style.opacity, '1');
  });

  it('removes a key the next object leaves out, and everything when cleared', () => {
    const { engine, node, style } = scene();
    engine.setProp(node, 'style', { opacity: 0.5, top: 12 });
    engine.setProp(node, 'style', { opacity: 1 });
    assert.equal(style.top, '');
    assert.equal(style.opacity, '1');
    engine.setProp(node, 'style', null);
    assert.equal(style.opacity, '');
  });
});

/**
 * A static `style="..."` is not a binding. Angular writes it once, whole, through the renderer's
 * `setAttribute('style', ...)`, which reaches the same `style` prop as the object above - so the
 * handler that made the object work has to take the string too, or every static style in a
 * template stops applying on the web.
 */
describe('a static style attribute', () => {
  let document: Document;
  before(async () => {
    ({ document } = installJsdomEnvironment());
    await import('@angular/compiler');
  });

  it('applies, through a real template', async () => {
    const { Component } = await import('@angular/core');
    const { mount } = await import('./mount.ts');
    const { View } = await import('./component-styles-app.ts');
    const StaticStyle = Component({
      selector: 'app-static-style',
      imports: [View],
      template: '<view id="styled" style="flex-grow: 2; margin-top: 4px"></view>',
    })(class {});
    const root = document.createElement('app-root');
    document.body.appendChild(root);
    const { componentRef } = mount(root, StaticStyle);

    const style = (document.getElementById('styled') as HTMLElement).style;
    assert.equal(style.flexGrow, '2');
    assert.equal(style.marginTop, '4px');
    componentRef.destroy();
  });
});
