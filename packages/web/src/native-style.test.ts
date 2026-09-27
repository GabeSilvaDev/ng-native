/**
 * React Native style keys that CSS has no property of the same name for.
 *
 * Every other style key reaches the browser dash-cased and in units, and the browser does the
 * rest. These did too, and the browser threw them away: `padding-horizontal` and `shadow-offset`
 * are not CSS, `{ width: 0, height: 6 }` is not a length, and `['small-caps', 'tabular-nums']`
 * stringifies with a comma CSS rejects. Nothing failed. A card with a React Native shadow was flat,
 * a row with `paddingHorizontal` sat against its edges, and the same `[style]` object looked right
 * on a device.
 *
 * Both ways a style arrives are covered, because they are two code paths: Angular's own `[style]`
 * bindings reach `BrowserRenderer.setStyle` one key at a time, and `[animatedStyle]` sets a whole
 * object as the `style` prop.
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { installJsdomEnvironment } from './jsdom-env.ts';
import type { BrowserEngine as Engine } from './browser-engine.ts';
import type { BrowserRenderer as Renderer } from './browser-renderer.ts';

let BrowserEngine: typeof Engine;
let BrowserRenderer: typeof Renderer;
let document: Document;

before(async () => {
  ({ document } = installJsdomEnvironment());
  ({ BrowserEngine } = await import('./browser-engine.ts'));
  ({ BrowserRenderer } = await import('./browser-renderer.ts'));
});

function scene() {
  const engine = new BrowserEngine(document);
  const renderer = new BrowserRenderer(engine, document);
  const node = engine.createElementNode('view');
  const style = (node.el as HTMLElement).style;
  /** One key at a time, as Angular's `[style]` bindings arrive. */
  const bind = (entries: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(entries)) renderer.setStyle(node, key, value);
  };
  /** A whole object, as `[animatedStyle]` writes one. */
  const setObject = (value: Record<string, unknown> | null) => engine.setProp(node, 'style', value);
  return { style, bind, setObject, unbind: (key: string) => renderer.removeStyle(node, key) };
}

const CARD = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.45,
  shadowRadius: 12,
};

describe("React Native's shadow keys", () => {
  it('become one box-shadow, bound key by key or as an object', () => {
    const expected = '0px 6px 12px color-mix(in srgb, #000000 45%, transparent)';
    const bound = scene();
    bound.bind(CARD);
    assert.equal(bound.style.boxShadow, expected);

    const object = scene();
    object.setObject(CARD);
    assert.equal(object.style.boxShadow, expected);
  });

  it('use the colour as it is at full opacity, and draw nothing without one, as iOS does', () => {
    const { style, bind, unbind } = scene();
    bind({ ...CARD, shadowOpacity: 1 });
    assert.equal(style.boxShadow, '0px 6px 12px #000000');
    // iOS's layer defaults `shadowOpacity` to zero, so a shadow nobody gave an opacity is not
    // drawn on a device either.
    unbind('shadowOpacity');
    assert.equal(style.boxShadow, '');
  });

  it('follow each key as it changes, and go when the last one does', () => {
    const { style, bind, unbind } = scene();
    bind(CARD);
    bind({ shadowOffset: { width: 2, height: 3 } });
    assert.equal(style.boxShadow, '2px 3px 12px color-mix(in srgb, #000000 45%, transparent)');
    for (const key of Object.keys(CARD)) unbind(key);
    assert.equal(style.boxShadow, '');
  });

  it('give way to a boxShadow the same style names outright', () => {
    const { style, bind } = scene();
    bind({ ...CARD, boxShadow: '0 1px 2px red' });
    assert.equal(style.boxShadow, '0 1px 2px red');
  });

  it('are removed with the object that set them', () => {
    const { style, setObject } = scene();
    setObject(CARD);
    setObject({ opacity: 1 });
    assert.equal(style.boxShadow, '');
  });
});

describe("React Native's text shadow keys", () => {
  it('become one text-shadow', () => {
    const { style, bind, unbind } = scene();
    bind({
      textShadowColor: 'red',
      textShadowOffset: { width: 1, height: 2 },
      textShadowRadius: 3,
    });
    assert.equal(style.textShadow, '1px 2px 3px red');
    unbind('textShadowColor');
    assert.equal(style.textShadow, '');
  });
});

describe('fontVariant', () => {
  it('is a space-separated list, not the comma-separated string an array turns into', () => {
    const { style, bind } = scene();
    bind({ fontVariant: ['small-caps', 'tabular-nums'] });
    assert.equal(style.fontVariant, 'small-caps tabular-nums');
  });
});

describe('the horizontal and vertical padding and margin keys', () => {
  it('set both edges they stand for', () => {
    const { style, bind } = scene();
    bind({ paddingHorizontal: 8, paddingVertical: 4, marginHorizontal: 2, marginVertical: 1 });
    assert.deepEqual(
      [style.paddingLeft, style.paddingRight, style.paddingTop, style.paddingBottom],
      ['8px', '8px', '4px', '4px'],
    );
    assert.deepEqual(
      [style.marginLeft, style.marginRight, style.marginTop, style.marginBottom],
      ['2px', '2px', '1px', '1px'],
    );
  });

  it('lose to the single edge, whichever was bound first, as in Yoga', () => {
    const { style, bind, unbind } = scene();
    bind({ paddingLeft: 3, paddingHorizontal: 8 });
    assert.equal(style.paddingLeft, '3px');
    assert.equal(style.paddingRight, '8px');
    unbind('paddingLeft');
    assert.equal(style.paddingLeft, '8px', 'the horizontal value comes back');
    unbind('paddingHorizontal');
    assert.equal(style.paddingLeft, '');
  });

  it('work as an object too', () => {
    const { style, setObject } = scene();
    setObject({ paddingVertical: 10, paddingTop: 2 });
    assert.equal(style.paddingTop, '2px');
    assert.equal(style.paddingBottom, '10px');
    setObject({});
    assert.equal(style.paddingBottom, '');
  });
});

describe("Yoga's start and end edges", () => {
  // The CSS compiler writes a logical inline edge as Yoga's own `start`, `marginStart` and
  // `paddingStart`, which every native view reads. Dash-cased as they are, `margin-start` and a
  // bare `start` are not CSS, so the browser would drop them; they are the logical properties.
  it('become the inline-start and inline-end properties', () => {
    const { style, bind, unbind } = scene();
    bind({ start: 4, end: 8, marginStart: 1, marginEnd: 2, paddingStart: 3, paddingEnd: 5 });
    assert.deepEqual(
      [
        style.getPropertyValue('inset-inline-start'),
        style.getPropertyValue('inset-inline-end'),
        style.getPropertyValue('margin-inline-start'),
        style.getPropertyValue('margin-inline-end'),
        style.getPropertyValue('padding-inline-start'),
        style.getPropertyValue('padding-inline-end'),
      ],
      ['4px', '8px', '1px', '2px', '3px', '5px'],
    );
    unbind('start');
    assert.equal(style.getPropertyValue('inset-inline-start'), '');
  });
});

describe('a shadow at the edges of what React Native accepts', () => {
  it('draws nothing at zero opacity', () => {
    const { style, bind } = scene();
    bind({ ...CARD, shadowOpacity: 0 });
    assert.equal(style.boxShadow, '');
  });

  it('is black when no colour is given, as it is on iOS', () => {
    const { style, bind } = scene();
    bind({ shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 });
    assert.equal(style.boxShadow, '0px 2px 4px black');
  });
});
