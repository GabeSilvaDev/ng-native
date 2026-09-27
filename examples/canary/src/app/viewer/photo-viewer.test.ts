import { Router, withComponentInputBinding } from '@angular/router';
import { Screen } from '@ng-native/device';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import {
  fireEvent,
  gestureOf,
  render,
  screen,
  settle,
  userEvent,
  waitFor,
  type FakeFabric,
  type FakeFabricNode,
} from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';

const flatten = (nodes: readonly FakeFabricNode[]): FakeFabricNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);
const byId = (fabric: FakeFabric, id: string) =>
  flatten(fabric.committed).find((node) => node.props['nativeID'] === id)!;

/** A phone's window, which a test can turn on its side. */
function windowOf(width: number, height: number) {
  const listeners = new Set<(sizes: never) => void>();
  let sizes = { window: { width, height }, screen: { width, height } };
  return {
    source: {
      current: () => sizes,
      subscribe: (listener: (sizes: never) => void) => (
        listeners.add(listener),
        () => listeners.delete(listener)
      ),
    },
    rotate() {
      sizes = {
        window: { width: sizes.window.height, height: sizes.window.width },
        screen: sizes.screen,
      };
      listeners.forEach((listener) => listener(sizes as never));
    },
  };
}

async function boot() {
  const phone = windowOf(402, 874);
  const app = await render(App, {
    providers: [
      provideNativeRouter(routes, withComponentInputBinding()),
      { provide: Screen.SOURCE, useValue: phone.source },
    ],
  });
  const injector = app.componentRef.injector;
  const nav = injector.get(NativeNavigation);
  await nav.push('/photos');
  await userEvent.press(await screen.findByRole('imagebutton', { name: 'Photo 4' }));
  await screen.findByText('4 of 12');
  const width = injector.get(Screen).window().width;
  const pager = () =>
    flatten(app.fabric.committed).find(
      (node) => node.viewName === 'ScrollView' && node.props['pagingEnabled'] === true,
    )!;
  const zooms = () => app.fabric.commands.filter((command) => command.name === 'zoomToRect');
  const doubleTap = async (page: number, x = 100, y = 200) => {
    const target = byId(app.fabric, `page-${page}`).children[0]!.children[0]!;
    gestureOf(target, 'Tap').callbacks['onEnd']!({ x, y } as never);
    await settle();
  };
  return { ...app, nav, width, pager, zooms, doubleTap, phone, router: injector.get(Router) };
}

describe('photo viewer', () => {
  test('opens on the photo tapped, as a sheet that swipes away', async () => {
    const { pager, width, router, fabric } = await boot();
    expect(router.url).toBe('/photos/3');
    expect(pager().props['contentOffset']).toEqual({ x: 3 * width, y: 0 });
    const sheets = flatten(fabric.committed).filter((n) => n.viewName === 'RNSScreen');
    expect(sheets.at(-1)!.props['stackPresentation']).toBe('pageSheet');
  });

  test('a double tap zooms in where it landed, and a second zooms back out', async () => {
    const { zooms, doubleTap, fabric } = await boot();
    await doubleTap(3, 120, 300);
    const zoomIn = zooms().at(-1)!;
    expect(zoomIn.node?.reactTag).toBe(byId(fabric, 'page-3').reactTag);
    const rect = zoomIn.args[0] as { width: number; x: number };
    expect(rect.width).toBeLessThan(200);
    await doubleTap(3);
    const rectOut = zooms().at(-1)!.args[0] as { x: number; width: number };
    expect(rectOut.x).toBe(0);
    expect(rectOut.width).toBe(402);
  });

  test('pages to the next photo, and zooms out the one it left', async () => {
    const { pager, width, doubleTap, zooms, fabric } = await boot();
    await doubleTap(3);
    await fireEvent(pager(), 'momentumScrollEnd', { contentOffset: { x: 4 * width, y: 0 } });
    expect(screen.getByText('5 of 12')).toBeTruthy();
    const reset = zooms().at(-1)!;
    expect(reset.node?.reactTag).toBe(byId(fabric, 'page-3').reactTag);
    expect(reset.args[1]).toBe(false);
  });

  test('a pinch reported by the page counts as zoomed, so paging away resets it', async () => {
    const { pager, width, zooms, fabric } = await boot();
    await fireEvent(byId(fabric, 'page-3'), 'scroll', {
      zoomScale: 2,
      contentOffset: { x: 0, y: 0 },
    });
    const before = zooms().length;
    await fireEvent(pager(), 'momentumScrollEnd', { contentOffset: { x: 2 * width, y: 0 } });
    expect(screen.getByText('3 of 12')).toBeTruthy();
    expect(zooms()).toHaveLength(before + 1);
  });

  test('fills the window on its side, and stays on the photo it was showing', async () => {
    const { phone, fabric, pager, width } = await boot();
    await fireEvent(pager(), 'momentumScrollEnd', { contentOffset: { x: 5 * width, y: 0 } });
    phone.rotate();
    await settle();
    expect(byId(fabric, 'page-3').props['width']).toBe(874);
    expect(pager().props['contentOffset']).toEqual({ x: 5 * 874, y: 0 });
    expect(screen.getByText('6 of 12')).toBeTruthy();
  });

  test('Done puts the viewer away', async () => {
    const { router } = await boot();
    await userEvent.press(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(router.url).toBe('/photos'));
  });
});
