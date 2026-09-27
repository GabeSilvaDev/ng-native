import { provideNativeRouter } from '@ng-native/router';
import { render, screen } from '@ng-native/testing';
import { expect, test } from 'vitest';
import { Home } from './home.ts';

test('lists the features', async () => {
  await render(Home, { providers: [provideNativeRouter([])] });
  expect(screen.getByText('Virtual list')).toBeTruthy();
});
