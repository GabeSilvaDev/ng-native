import { withComponentInputBinding } from '@angular/router';
import { Accessibility } from '@ng-native/device';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import { render, screen, userEvent, waitFor, type FakeFabricNode } from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';

const flatten = (nodes: readonly FakeFabricNode[]): FakeFabricNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

async function boot() {
  const announced: string[] = [];
  const app = await render(App, {
    providers: [
      provideNativeRouter(routes, withComponentInputBinding()),
      {
        provide: Accessibility.SOURCE,
        useValue: {
          current: () =>
            Promise.resolve({
              screenReader: false,
              reduceMotion: false,
              boldText: false,
              fontScale: 1,
            }),
          subscribe: () => () => {},
          announce: (message: string) => announced.push(message),
        },
      },
    ],
  });
  const nav = app.componentRef.injector.get(NativeNavigation);
  await nav.push('/overlays');
  await screen.findByRole('button', { name: 'Open a sheet' });
  return { ...app, nav, announced };
}

describe('overlays', () => {
  test('a toast raised from a sheet is drawn in the overlay, above the stack', async () => {
    const { fabric } = await boot();
    await userEvent.press(screen.getByRole('button', { name: 'Open a sheet' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Show a toast' })).toHaveLength(2),
    );
    await userEvent.press(screen.getAllByRole('button', { name: 'Show a toast' }).at(-1)!);
    const toast = await screen.findByRole('alert');
    expect(toast.props['accessibilityLabel']).toBe('Shown above the sheet');
    const overlay = flatten(fabric.committed).find((n) => n.viewName === 'RNSFullWindowOverlay')!;
    expect(flatten([overlay])).toContain(toast);
    const stack = flatten(fabric.committed).find((n) => n.viewName === 'RNSScreenStack')!;
    expect(flatten([stack])).not.toContain(toast);
  });

  test('a toast is announced, which a screen reader hears even while a sheet holds its focus', async () => {
    // A presented sheet is modal to VoiceOver, so a toast drawn in the overlay above it is never
    // reached by moving through the screen; it has to be spoken.
    const { announced } = await boot();
    await userEvent.press(screen.getByRole('button', { name: 'Open a sheet' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Show a toast' })).toHaveLength(2),
    );
    await userEvent.press(screen.getAllByRole('button', { name: 'Show a toast' }).at(-1)!);
    expect(announced).toEqual(['Shown above the sheet']);
  });

  test('the loading cover comes and goes, and says it is loading', async () => {
    await boot();
    await userEvent.press(screen.getByRole('button', { name: 'Load for a moment' }));
    expect(screen.getByLabelText('Loading')).toBeTruthy();
    await waitFor(() => expect(screen.queryByLabelText('Loading')).toBeNull(), { timeout: 2500 });
    expect(screen.getByRole('alert').props['accessibilityLabel']).toBe('Loaded');
  });
});
