import { Router, withComponentInputBinding } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import {
  fireEvent,
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
import { StoreSearch, matches } from './catalogue.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function boot() {
  const store = new StoreSearch();
  store.latency = 20;
  const app = await render(App, {
    providers: [
      provideNativeRouter(routes, withComponentInputBinding()),
      { provide: StoreSearch, useValue: store },
    ],
  });
  const injector = app.componentRef.injector;
  const nav = injector.get(NativeNavigation);
  await nav.push('/search-demo');
  await waitFor(() => expect(app.fabric.find('RNSSearchBar')).toBeTruthy());
  const bar = () => app.fabric.find('RNSSearchBar')!;
  // The results list is the newest scroll view: the home screen's is still on the stack below.
  const lists = () => {
    const found: FakeFabricNode[] = [];
    const walk = (nodes: readonly FakeFabricNode[]) =>
      nodes.forEach((node) => {
        if (node.viewName === 'ScrollView') found.push(node);
        walk(node.children);
      });
    walk(app.fabric.committed);
    return found;
  };
  await fireEvent(lists().at(-1)!, 'layout', { layout: { width: 402, height: 3000 } });
  const type = async (text: string) => {
    await fireEvent.changeText(bar(), text);
  };
  return { ...app, store, nav, router: injector.get(Router), bar, type };
}

const heading = (fabric: FakeFabric, prefix: string) =>
  JSON.stringify(fabric.committed).match(new RegExp(`${prefix}[^"]*`))?.[0];

describe('the library filter', () => {
  test('finds an item by its subtitle as well as its title, in any case', () => {
    const album = { id: 'a', kind: 'album', title: 'Blue', subtitle: 'Joni Mitchell' } as const;
    expect(matches(album, 'JONI', 'all')).toBe(true);
    expect(matches(album, 'blue', 'album')).toBe(true);
    expect(matches(album, 'blue', 'song')).toBe(false);
    expect(matches(album, 'miles', 'all')).toBe(false);
  });
});

describe('music search', () => {
  test('filters the library as the user types', async () => {
    const { fabric, type } = await boot();
    const all = heading(fabric, 'In your library');
    await type('coltrane');
    expect(heading(fabric, 'In your library')).not.toBe(all);
    expect(screen.getAllByText(/John Coltrane/).length).toBeGreaterThan(0);
  });

  test('asks the store once the typing pauses, not for every key', async () => {
    const { store, type } = await boot();
    for (const text of ['b', 'bl', 'blu', 'blue', 'blue t', 'blue tr']) await type(text);
    await wait(450);
    expect(store.requests).toBe(1);
    await screen.findAllByText(/blue tr \(store/);
  });

  test('cancels a search overtaken by a newer one, and never shows its late answer', async () => {
    const { store, type } = await boot();
    store.latency = 200;
    await type('bl');
    await wait(350); // the store is asked about "bl", which is slow
    await type('blue train');
    await wait(350);
    expect(store.cancelled).toBe(1);
    await screen.findAllByText(/blue train \(store/, undefined, { timeout: 2000 });
    await wait(400);
    expect(screen.queryAllByText(/^bl \(store/)).toHaveLength(0);
  });

  test('says when the store fails, and tries again when asked', async () => {
    const { store, type } = await boot();
    store.failing = true;
    await type('moon');
    await screen.findByText('The store did not answer.', undefined, { timeout: 2000 });
    store.failing = false;
    await userEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await screen.findAllByText(/moon \(store/);
  });

  test('puts a recent search in the field and searches it', async () => {
    const { fabric, bar } = await boot();
    await fireEvent(bar(), 'searchFocus', {});
    await userEvent.press(screen.getByRole('button', { name: 'Coltrane' }));
    expect(fabric.commands.some((c) => c.name === 'setText' && c.args[0] === 'Coltrane')).toBe(
      true,
    );
    await screen.findAllByText(/Coltrane \(store/);
  });

  test('narrows to a scope', async () => {
    const { type } = await boot();
    await type('blue');
    await userEvent.press(screen.getByRole('button', { name: 'Artists' }));
    expect(screen.queryAllByText(/^Song by/)).toHaveLength(0);
  });

  test('comes back from a result with the query and the results as they were', async () => {
    const { store, type, nav, router } = await boot();
    await type('river');
    await screen.findAllByText(/river \(store/);
    const asked = store.requests;
    await userEvent.press(screen.getAllByRole('button', { name: /River/ })[0]!);
    await waitFor(() => expect(router.url).toMatch(/^\/search-demo\/./));
    nav.back();
    for (let turn = 0; turn < 6; turn++) await settle();
    expect(router.url).toBe('/search-demo');
    expect(screen.getAllByText(/river \(store/).length).toBeGreaterThan(0);
    expect(store.requests).toBe(asked);
  });
});
