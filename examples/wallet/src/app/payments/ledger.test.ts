import { expect, test } from 'vitest';
import { money } from './ledger.ts';
import { toPence } from '../send/send.ts';

test('money is pounds and pence, with thousands separated', () => {
  expect(money(124_050)).toBe('£1,240.50');
  expect(money(-480, { signed: true })).toBe('- £4.80');
  expect(money(320_000, { signed: true })).toBe('+ £3,200.00');
});

test('an amount is read the way people type one', () => {
  expect(toPence('12')).toBe(1200);
  expect(toPence('£1,200.5')).toBe(120_050);
  expect(toPence('12.345')).toBeNaN();
  expect(toPence('twelve')).toBeNaN();
});
