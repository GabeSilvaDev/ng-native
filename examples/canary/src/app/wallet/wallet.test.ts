import { withComponentInputBinding } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import { render, screen, userEvent } from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';
import { TRANSACTIONS, dailySpend, money, shares } from './wallet-model.ts';

describe('the wallet model', () => {
  test('writes money the UK way, converted', () => {
    expect(money(1840, 'GBP')).toBe('£18.40');
    expect(money(1840, 'EUR')).toBe('€21.53');
    expect(money(-290, 'GBP')).toBe('-£2.90');
    expect(money(1840, 'JPY')).toBe('JP¥3,459');
  });

  test('adds up a week of spending by day, oldest first, leaving out income', () => {
    const days = dailySpend(TRANSACTIONS);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(1840 + 290);
    expect(days[5]).toBe(650);
  });

  test('shares out what was spent by category, largest first', () => {
    const parts = shares(TRANSACTIONS);
    expect(parts[0]!.category).toBe('bills');
    expect(parts.reduce((sum, part) => sum + part.share, 0)).toBeCloseTo(1);
    expect(parts.some((part) => part.category === 'income')).toBe(false);
  });
});

describe('wallet', () => {
  test('shows every amount in the currency chosen', async () => {
    const app = await render(App, {
      providers: [provideNativeRouter(routes, withComponentInputBinding())],
    });
    await app.componentRef.injector.get(NativeNavigation).push('/wallet');
    expect(await screen.findAllByText('£11,093.11')).toHaveLength(2);
    await userEvent.press(screen.getByRole('tab', { name: 'EUR' }));
    expect(await screen.findAllByText('€12,978.94')).toHaveLength(2);
    expect(screen.getByLabelText('Borough Market, -€21.53')).toBeTruthy();
  });

  test('a tapped day says what was spent on it', async () => {
    const app = await render(App, {
      providers: [provideNativeRouter(routes, withComponentInputBinding())],
    });
    await app.componentRef.injector.get(NativeNavigation).push('/wallet');
    const bars = await screen.findAllByRole('button', { name: /, £/ });
    await userEvent.press(bars[5]!);
    expect(screen.getByText(/, £6\.50$/)).toBeTruthy();
  });
});
