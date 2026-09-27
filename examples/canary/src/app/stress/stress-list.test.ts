import { fireEvent, render, screen, settle, userEvent } from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { StressList } from './stress-list.ts';

async function boot() {
  const app = await render(StressList);
  await fireEvent(app.fabric.find('ScrollView')!, 'layout', {
    layout: { width: 402, height: 800 },
  });
  return app;
}

const rowsShown = (fabric: Awaited<ReturnType<typeof boot>>['fabric']) =>
  JSON.stringify(fabric.committed).match(/"nativeID":"row-s\d+"/g)?.length ?? 0;

describe('stress list', () => {
  test('renders a window of ten thousand rows, and says how long the first render took', async () => {
    const { fabric } = await boot();
    expect(rowsShown(fabric)).toBeGreaterThan(5);
    expect(rowsShown(fabric)).toBeLessThan(40);
    expect(screen.getByText(/^10000 rows, first render/)).toBeTruthy();
  });

  test('filters as the user types', async () => {
    await boot();
    await userEvent.type(screen.getByLabelText('Filter'), 'bravo nova 1');
    expect(screen.queryAllByText(/^alpha/)).toHaveLength(0);
    expect(screen.getAllByText(/^bravo nova 1/).length).toBeGreaterThan(0);
  });

  test('reprices rows on screen while live, and reports a measured run', async () => {
    await boot();
    await userEvent.press(screen.getByRole('button', { name: 'Measure' }));
    await userEvent.press(screen.getByRole('button', { name: 'Live prices' }));
    await new Promise((resolve) => setTimeout(resolve, 350));
    await settle();
    await userEvent.press(screen.getByRole('button', { name: 'Stop prices' }));
    await userEvent.press(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByText(/commits, \d+ over 8ms/)).toBeTruthy();
  });
});
