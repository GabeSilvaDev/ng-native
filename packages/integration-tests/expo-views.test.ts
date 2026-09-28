/**
 * The typed native views: `<expo-glass>`, `<expo-glass-container>`, `<expo-symbol>` and
 * `<apple-sign-in-button>`. Each input reaches its view as the prop native reads, with what the
 * module's React wrapper would have done to it first - a symbol's size, type and colours, the
 * Apple button's type and style as the numbers native takes.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Type } from '@angular/core';
import { liquidGlassAvailable, registerExpoViews } from '@ng-native/expo';
import { mount } from '@ng-native/platform';
import { createFakeFabric, type FakeFabricNode } from '@ng-native/testing';
import { compileFixture } from './compile.ts';

const all = (nodes: readonly FakeFabricNode[]): FakeFabricNode[] =>
  nodes.flatMap((node) => [node, ...all(node.children)]);

async function render() {
  const mod = await compileFixture(
    fileURLToPath(new URL('./fixtures/expo-views.ts', import.meta.url)),
  );
  registerExpoViews('expo-glass', 'expo-glass-container', 'expo-symbol', 'apple-sign-in-button');
  const fabric = createFakeFabric();
  const app = mount(1, mod['ExpoViewsFixture'] as Type<unknown>, fabric);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const byId = (id: string) => all(fabric.committed).find((node) => node.props['nativeID'] === id)!;
  return { app, fabric, byId };
}

describe('the typed native views', () => {
  let unmount: (() => void) | undefined;
  afterEach(() => unmount?.());

  it('commits each as its module s view', async () => {
    const { app, byId } = await render();
    unmount = () => app.applicationRef.destroy();
    assert.equal(byId('glass').viewName, 'ViewManagerAdapter_ExpoGlassEffect_GlassView');
    assert.equal(byId('container').viewName, 'ViewManagerAdapter_ExpoGlassEffect_GlassContainer');
    assert.equal(byId('heart').viewName, 'ViewManagerAdapter_SymbolModule');
    assert.equal(byId('apple').viewName, 'ViewManagerAdapter_ExpoAppleAuthentication');
  });

  it('passes the glass effect s props through, and leaves unset ones to native', async () => {
    const { app, byId } = await render();
    unmount = () => app.applicationRef.destroy();
    const glass = byId('glass').props;
    assert.equal(glass['glassEffectStyle'], 'clear');
    assert.equal(glass['tintColor'], '#ff000033');
    assert.equal(glass['isInteractive'], true, 'a bare attribute is on');
    assert.equal(byId('container').props['spacing'], 12, 'a static number is a number');
    assert.equal(byId('plain').props['glassEffectStyle'], undefined);
    assert.equal(byId('plain').props['isInteractive'], undefined);
  });

  it('sizes, types and colours a symbol as the React wrapper does', async () => {
    const { app, byId } = await render();
    unmount = () => app.applicationRef.destroy();
    const heart = byId('heart').props;
    assert.equal(heart['name'], 'heart.fill');
    assert.equal(heart['type'], 'monochrome', 'the type native needs, unset');
    assert.equal(heart['tintColor'], 'red');
    assert.equal(heart['weight'], 'bold');
    assert.equal(heart['animated'], false);
    assert.equal(heart['width'], 32);
    assert.equal(heart['height'], 32);

    const palette = byId('palette').props;
    assert.equal(palette['type'], 'palette');
    assert.deepEqual(palette['colors'], ['#fff', '#fc0']);
    assert.equal(palette['animated'], true, 'an animation spec is what animates it');
    assert.deepEqual(palette['animationSpec'], { effect: { type: 'bounce' } });

    const plain = byId('default').props;
    assert.equal(plain['width'], 24, 'the wrapper s default size');
    assert.equal(plain['height'], 24);
  });

  it('gives the Apple button its type and style as native s numbers, and reports a press', async () => {
    const { app, fabric, byId } = await render();
    unmount = () => app.applicationRef.destroy();
    const apple = byId('apple');
    assert.equal(apple.props['buttonType'], 1, 'continue');
    assert.equal(apple.props['buttonStyle'], 2, 'black');
    assert.equal(apple.props['cornerRadius'], 8);

    fabric.emit(apple, 'topButtonPress', {});
    app.applicationRef.tick();
    assert.equal((app.componentRef.instance as { presses(): number }).presses(), 1);
  });
});

describe('liquidGlassAvailable', () => {
  const global = globalThis as { expo?: unknown };
  const before = global.expo;
  afterEach(() => (global.expo = before));

  it('is what the glass module reports, and false without it', () => {
    global.expo = { modules: { ExpoGlassEffect: { isLiquidGlassAvailable: true } } };
    assert.equal(liquidGlassAvailable(), true);
    global.expo = { modules: { ExpoGlassEffect: { isLiquidGlassAvailable: false } } };
    assert.equal(liquidGlassAvailable(), false);
    global.expo = { modules: {} };
    assert.equal(liquidGlassAvailable(), false);
  });
});
