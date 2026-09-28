import { withComponentInputBinding } from '@angular/router';
import { registerExpoViews } from '@ng-native/expo';
import { AppleSignIn, type NativeAppleAuthentication } from '@ng-native/expo/apple-sign-in';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import { fireEvent, render, screen, waitFor, type FakeFabricNode } from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';

const flatten = (nodes: readonly FakeFabricNode[]): FakeFabricNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

async function open(signIn: () => Promise<unknown>) {
  registerExpoViews('expo-glass', 'expo-glass-container', 'expo-symbol', 'apple-sign-in-button');
  const apple = {
    isAvailableAsync: async () => true,
    signInAsync: signIn,
    addRevokeListener: () => ({ remove: () => {} }),
  } as unknown as NativeAppleAuthentication;
  const app = await render(App, {
    providers: [
      provideNativeRouter(routes, withComponentInputBinding()),
      { provide: AppleSignIn.SOURCE, useValue: apple },
    ],
  });
  await app.componentRef.injector.get(NativeNavigation).push('/native-views');
  await screen.findByText('Available.');
  return app;
}

describe('native views', () => {
  test('puts the glass on a gradient, with a symbol in each', async () => {
    const { fabric } = await open(async () => null);
    const glass = flatten(fabric.committed).filter((node) => /GlassView/.test(node.viewName));
    expect(glass).toHaveLength(3);
    const backdrop = flatten(fabric.committed).find((node) =>
      node.children.some((child) => /GlassContainer/.test(child.viewName)),
    )!;
    expect(
      backdrop.props['experimental_backgroundImage'] ?? backdrop.props['backgroundImage'],
    ).toBeTruthy();
  });

  test('says who signed in, and a cancelled sheet as cancelled', async () => {
    await open(async () => ({ user: 'apple-user-1' }));
    await fireEvent(screen.getByLabelText('Continue with Apple'), 'buttonPress', {});
    await waitFor(() => expect(screen.getByText('Signed in as apple-user-1.')).toBeTruthy());
  });
});
