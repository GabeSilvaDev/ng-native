import { withComponentInputBinding } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import { render, screen, userEvent } from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';
import {
  Basket,
  FREE_DELIVERY,
  PRODUCTS,
  added,
  changed,
  price,
  saving,
  type Product,
} from './shop-model.ts';

describe('the shop model', () => {
  test('prices whole pounds without pence, and pence when there are some', () => {
    expect(price(11900)).toBe('£119');
    expect(price(2850)).toBe('£28.50');
  });

  test('says what a sale saves', () => {
    expect(saving(PRODUCTS[0]!)).toBe(18);
    expect(saving(PRODUCTS[1]!)).toBe(0);
  });

  test('adds to a line already in the basket, and a new size is a new line', () => {
    const shoe = PRODUCTS[0]!;
    const once = added([], shoe, '9');
    const twice = added(once, shoe, '9');
    expect(twice).toHaveLength(1);
    expect(twice[0]!.quantity).toBe(2);
    expect(added(twice, shoe, '10')).toHaveLength(2);
  });

  test('counts every item for the badge, not every line', () => {
    const basket = new Basket();
    basket.add(PRODUCTS[1]!, 'M');
    basket.add(PRODUCTS[1]!, 'M');
    expect(basket.count()).toBe(2);
  });

  test('delivers free from exactly the threshold, and charges a penny under it', () => {
    const at = (pence: number) => {
      const basket = new Basket();
      basket.add({ ...PRODUCTS[2]!, price: pence } satisfies Product, null);
      return basket.delivery();
    };
    expect(at(FREE_DELIVERY)).toBe(0);
    expect(at(FREE_DELIVERY - 1)).toBeGreaterThan(0);
  });

  test('takes a line out when its quantity reaches nothing', () => {
    const lines = added([], PRODUCTS[2]!, null);
    expect(changed(lines, lines[0]!, -1)).toEqual([]);
  });
});

async function boot(path: string) {
  const app = await render(App, {
    providers: [provideNativeRouter(routes, withComponentInputBinding())],
  });
  const nav = app.componentRef.injector.get(NativeNavigation);
  await nav.push(path);
  return { app, nav };
}

describe('shop', () => {
  test('a product with sizes waits for one, then goes in the basket', async () => {
    await boot('/shop/p1');
    const add = await screen.findByRole('button', { name: 'Choose a size' });
    await userEvent.press(add);
    expect(screen.getByRole('button', { name: 'Choose a size' })).toBeTruthy();
    await userEvent.press(screen.getByRole('radio', { name: 'Size 9' }));
    await userEvent.press(screen.getByRole('button', { name: 'Add to basket' }));
    await screen.findByRole('button', { name: 'Added to basket' });
  });

  test('the basket steps quantities and reaches free delivery', async () => {
    const { nav } = await boot('/shop/p3');
    await userEvent.press(await screen.findByRole('button', { name: 'Add to basket' }));
    await nav.present('/shop/basket', { as: 'pageSheet' });
    await screen.findByText('£47 away from free delivery');
    await userEvent.press(screen.getByRole('button', { name: 'One more Canvas Tote' }));
    await userEvent.press(screen.getByRole('button', { name: 'One more Canvas Tote' }));
    await screen.findByText('Free delivery unlocked');
    expect(screen.getByLabelText('3 of Canvas Tote')).toBeTruthy();
  });
});
