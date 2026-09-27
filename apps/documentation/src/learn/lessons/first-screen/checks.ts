import { render, screen } from '@ng-native/testing';
import { expect } from 'vitest';
import { check } from '../../check.ts';
import { App } from './solution/app.ts';

check(
  1,
  'The screen says Today',
  async () => {
    await render(App);
    expect(screen.getByText('Today')).toBeTruthy();
  },
  'Change the word between <text> and </text> to Today.',
);

check(
  2,
  'A second line says 3 left to do',
  async () => {
    await render(App);
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText(/left to do$/)).toBeTruthy();
  },
  'Add another <text> inside the <view>, after the first one.',
);
