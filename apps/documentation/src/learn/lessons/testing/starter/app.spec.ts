import { render, screen } from '@ng-native/testing';
import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('shows the day', async () => {
    await render(App);
    expect(screen.getByText('Today')).toBeTruthy();
  });
});
