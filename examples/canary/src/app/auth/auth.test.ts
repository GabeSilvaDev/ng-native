import { Router, withComponentInputBinding } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import {
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
const screens = (fabric: FakeFabric) =>
  flatten(fabric.committed).filter((node) => node.viewName === 'RNSScreen');

async function idle() {
  for (let turn = 0; turn < 8; turn++) await settle();
}

async function boot() {
  const app = await render(App, {
    providers: [provideNativeRouter(routes, withComponentInputBinding())],
  });
  const injector = app.componentRef.injector;
  return { ...app, nav: injector.get(NativeNavigation), router: injector.get(Router) };
}

async function signIn(password = 'correct horse', code = '123456') {
  await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com');
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  if (password !== 'correct horse') return;
  await userEvent.type(await screen.findByLabelText('Code'), code);
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
}

describe('authentication', () => {
  test('a signed-in screen asks to sign in first, then replaces sign-in with it', async () => {
    const { nav, router, fabric } = await boot();
    await nav.push('/account');
    await waitFor(() => expect(router.url).toBe('/auth/login'));
    await signIn();
    await screen.findByText('Signed in as ada@example.com');
    expect(router.url).toBe('/account');
    await idle();
    // Nothing to go back to: not the code, not sign-in, not the screen before.
    expect(screens(fabric)).toHaveLength(1);
    nav.back();
    await idle();
    expect(router.url).toBe('/account');
  });

  test('says when the password or the code is wrong, and locks after three wrong passwords', async () => {
    const { nav } = await boot();
    await nav.push('/auth/login');
    await signIn('nope');
    await screen.findByText('That password is not right.');
    await userEvent.press(await screen.findByRole('button', { name: 'Sign in' }));
    await screen.findByText('That password is not right.');
    await userEvent.press(await screen.findByRole('button', { name: 'Sign in' }));
    await screen.findByText('Too many attempts. Try again later.');
  });

  test('a wrong code keeps the user on the code screen', async () => {
    const { nav, router } = await boot();
    await nav.push('/auth/login');
    await signIn('correct horse', '000000');
    await screen.findByText('That code is not right.');
    expect(router.url).toBe('/auth/code');
  });

  test('a session that expires while a sheet is up leaves only sign-in, and says why', async () => {
    const { nav, router, fabric } = await boot();
    await nav.push('/account');
    await signIn();
    await screen.findByText('Signed in as ada@example.com');
    await userEvent.press(screen.getByRole('button', { name: 'Settings' }));
    await userEvent.press(await screen.findByRole('button', { name: 'Let the session expire' }));
    await waitFor(() => expect(router.url).toBe('/auth/login'));
    await idle();
    expect(screens(fabric)).toHaveLength(1);
    expect(screen.getByText('Your session has expired. Sign in again.')).toBeTruthy();
    expect(screen.queryByText(/Signed in as/)).toBeNull();
  });

  test('signing out leaves only sign-in, and the signed-in screens ask again', async () => {
    const { nav, router, fabric } = await boot();
    await nav.push('/account');
    await signIn();
    await userEvent.press(await screen.findByRole('button', { name: 'Orders' }));
    await waitFor(() => expect(router.url).toBe('/account/orders'));
    nav.back();
    await waitFor(() => expect(router.url).toBe('/account'));
    await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(router.url).toBe('/auth/login'));
    await idle();
    expect(screens(fabric)).toHaveLength(1);
    await nav.push('/account/orders');
    await waitFor(() => expect(router.url).toBe('/auth/login'));
  });
});
