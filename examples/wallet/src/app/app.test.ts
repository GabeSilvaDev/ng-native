import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import { Router, withComponentInputBinding } from '@angular/router';
import { fireEvent, render, screen, userEvent, within } from '@ng-native/testing';
import { expect, test } from 'vitest';
import { App } from './app.ts';
import { routes } from './app.routes.ts';

// The same router features as index.ts: the payment screen's `id` arrives as an input.
const start = () =>
  render(App, { providers: [provideNativeRouter(routes, withComponentInputBinding())] });

test('hides the balance when the card is tapped', async () => {
  await start();
  const card = await screen.findByRole('button', { name: 'Hide balance' });

  await userEvent.press(card);

  expect(screen.getByText('£ ••••••')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Show balance' })).toBeTruthy();
});

test('sends money, and the payment is the first thing on the home screen', async () => {
  await start();
  await userEvent.press(await screen.findByRole('button', { name: 'Send money' }));

  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Recipient'), 'Grace Hopper');
  await user.type(screen.getByLabelText('Amount'), '12.50');
  await user.press(screen.getByRole('button', { name: 'Send £12.50' }));

  expect(await screen.findByText('Grace Hopper')).toBeTruthy();
  expect(screen.getByText('- £12.50')).toBeTruthy();
});

test('will not send more than the balance', async () => {
  await start();
  await userEvent.press(await screen.findByRole('button', { name: 'Send money' }));

  await userEvent.type(await screen.findByLabelText('Amount'), '999999');

  expect(screen.getByText('More than you have')).toBeTruthy();
});

test('searches the activity list from the navigation bar', async () => {
  await start();
  await userEvent.press(await screen.findByRole('link', { name: 'See all' }));
  const search = await screen.findByTestId('search');
  // The home tab is still mounted behind this one, with payments of its own.
  const list = within(screen.getByTestId('payments'));
  expect(list.queryAllByText('Pret').length).toBeGreaterThan(0);

  await userEvent.type(search, 'spotify');

  expect(list.queryAllByText('Spotify').length).toBeGreaterThan(0);
  expect(list.queryAllByText('Pret')).toHaveLength(0);
});

test('hiding the balance in settings hides it on the home screen', async () => {
  const { componentRef } = await start();
  await screen.findByRole('button', { name: 'Hide balance' });
  await componentRef.injector.get(Router).navigateByUrl('/settings');

  await fireEvent(await screen.findByRole('switch', { name: 'Hide balance' }), 'change', {
    value: true,
  });
  await componentRef.injector.get(Router).navigateByUrl('/home');

  expect(await screen.findByText('£ ••••••')).toBeTruthy();
});

test('a payment opened from home goes back to home, and the activity list still opens one', async () => {
  const { componentRef } = await start();
  const recent = await screen.findAllByRole('button', { name: /Blue Bottle/ });
  await userEvent.press(recent[0]!);
  expect(await screen.findByText('Category')).toBeTruthy();

  componentRef.injector.get(NativeNavigation).back();
  await userEvent.press(await screen.findByRole('link', { name: 'See all' }));
  const list = within(await screen.findByTestId('payments'));
  await userEvent.press(list.getAllByRole('button', { name: /Dishoom/ })[0]!);

  expect(await screen.findByText('Eating out')).toBeTruthy();
  expect(screen.getAllByText('Category')).toHaveLength(1);
});
