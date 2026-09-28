import { withComponentInputBinding } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import { render, screen, userEvent } from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';

async function boot() {
  const app = await render(App, {
    providers: [provideNativeRouter(routes, withComponentInputBinding())],
  });
  await app.componentRef.injector.get(NativeNavigation).push('/forms');
  return screen.findByPlaceholderText('name');
}

describe('signal forms', () => {
  test('an empty name is an error, as a short one is', async () => {
    await boot();
    await screen.findByText('1 validation error(s)');
  });

  test('a long enough name is valid, and the model shows what was typed', async () => {
    const name = await boot();
    await userEvent.type(name, 'abcdefgh');
    await screen.findByText('valid');
    expect(screen.getByText(/"name":"abcdefgh"/)).toBeTruthy();
  });
});
