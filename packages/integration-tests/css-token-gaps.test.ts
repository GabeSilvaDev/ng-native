/**
 * Three places a token goes in the stylesheets design systems ship, which each read on device:
 * a `text-shadow` coloured by one, `flex: var(--grow)`, and a radial gradient centred at one.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRequire } from 'node:module';
import { StyleResolver, type StyleTarget } from '@ng-native/fabric';

const require = createRequire(import.meta.url);
const { compileCss } = require('@ng-native/metro/css/compile.cjs');

function resolvedStyle(css: string): Record<string, unknown> {
  const target = (parent: StyleTarget | null, own: string[]): StyleTarget => ({
    name: 'view',
    parent,
    classes: new Set(own),
    props: {},
    sheet: null,
    hostSheet: null,
    styleCache: null,
    styleDirty: true,
  });
  const node = target(target(null, []), ['a']);
  const resolver = new StyleResolver(compileCss(css, 'gaps'), {
    width: 400,
    height: 800,
    colorScheme: 'light',
  });
  return resolver.resolve(node, 1).style as Record<string, unknown>;
}

describe('text-shadow with tokens', () => {
  it('takes its colour from a token', () => {
    const style = resolvedStyle('.a { --glow: #3b82f6; text-shadow: 0 1px 2px var(--glow); }');
    assert.deepEqual(style['textShadowOffset'], { width: 0, height: 1 });
    assert.equal(style['textShadowRadius'], 2);
    assert.equal(style['textShadowColor'], 'rgb(59, 130, 246)');
  });

  it('takes a length and a mixed colour from tokens too', () => {
    const style = resolvedStyle(
      '.a { --lift: 3px; --ink: #000000; text-shadow: 0 var(--lift) 6px color-mix(in srgb, var(--ink) 50%, white); }',
    );
    assert.deepEqual(style['textShadowOffset'], { width: 0, height: 3 });
    assert.equal(style['textShadowRadius'], 6);
    assert.equal(style['textShadowColor'], 'rgb(128, 128, 128)');
  });

  it('is not written when its colour token is not set', () => {
    const style = resolvedStyle('.a { text-shadow: 0 1px 2px var(--nothing); }');
    assert.equal(style['textShadowColor'], undefined);
  });
});

describe('flex with a token', () => {
  it('grows by the token, as flex: <number> does', () => {
    const style = resolvedStyle('.a { --grow: 2; flex: var(--grow); }');
    assert.equal(style['flexGrow'], 2);
    assert.equal(style['flexShrink'], 1);
    assert.equal(style['flexBasis'], '0%');
  });
});

describe('a radial gradient centred at a token', () => {
  it('reads the position from the token', () => {
    const style = resolvedStyle(
      '.a { --x: 20%; background-image: radial-gradient(circle at var(--x) 30%, red, blue); }',
    );
    const [gradient] = style['experimental_backgroundImage'] as { position: unknown }[];
    assert.deepEqual(gradient!.position, { left: '20%', top: '30%' });
  });

  it('falls back to what is written beside the var()', () => {
    const style = resolvedStyle(
      '.a { background-image: radial-gradient(circle at var(--x, 10%) bottom, red, blue); }',
    );
    const [gradient] = style['experimental_backgroundImage'] as { position: unknown }[];
    assert.deepEqual(gradient!.position, { left: '10%', bottom: 0 });
  });
});

describe('a gradient stop that is a token with a fallback', () => {
  it('paints the fallback when the token is not set', () => {
    const style = resolvedStyle(
      '.a { background-image: linear-gradient(red, var(--tint, blue)); }',
    );
    const [gradient] = style['experimental_backgroundImage'] as {
      colorStops: { color: string }[];
    }[];
    assert.deepEqual(
      gradient!.colorStops.map((stop) => stop.color),
      ['red', 'blue'],
    );
  });
});

describe('a logical border side with a token in it', () => {
  it('draws the start side in the token colour', () => {
    const style = resolvedStyle(
      '.a { --accent: #ff0000; border-inline-start: 4px solid var(--accent); }',
    );
    assert.equal(style['borderStartWidth'], 4);
    assert.equal(style['borderStartColor'], 'rgb(255, 0, 0)');
  });

  it('draws both block sides in it', () => {
    const style = resolvedStyle('.a { --rule: #0000ff; border-block: 1px solid var(--rule); }');
    assert.equal(style['borderTopColor'], 'rgb(0, 0, 255)');
    assert.equal(style['borderBottomColor'], 'rgb(0, 0, 255)');
    assert.equal(style['borderBottomWidth'], 1);
  });
});
