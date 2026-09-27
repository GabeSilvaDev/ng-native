import { render, screen, userEvent } from '@ng-native/testing';
import { describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { HabitRow } from './habit-row';

describe('App', () => {
  it('shows the day', async () => {
    await render(App);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('shows every habit, and how many are left', async () => {
    await render(App);
    expect(screen.getByText('Drink water')).toBeTruthy();
    expect(screen.getByText('Read ten pages')).toBeTruthy();
    expect(screen.getByText('Walk')).toBeTruthy();
    expect(screen.getByText('2 left to do')).toBeTruthy();
  });

  it('ticks a habit off when it is pressed', async () => {
    await render(App);
    await userEvent.press(screen.getByText('Drink water'));
    expect(screen.getByText('1 left to do')).toBeTruthy();
  });
});

describe('HabitRow', () => {
  it('says when it is pressed', async () => {
    const toggle = vi.fn();
    await render(HabitRow, { inputs: { name: 'Stretch' }, on: { toggle } });
    await userEvent.press(screen.getByRole('button'));
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
