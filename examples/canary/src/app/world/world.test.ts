import { withComponentInputBinding } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import { fireEvent, render, screen, userEvent } from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';
import { LOCALES, message } from './world-model.ts';

const locale = (tag: string) => LOCALES.find((one) => one.tag === tag)!;

describe('plural messages', () => {
  test('English takes its exact zero, then one and other', () => {
    expect(message(locale('en-GB'), 0)).toBe('No new messages');
    expect(message(locale('en-GB'), 1)).toBe('1 new message');
    expect(message(locale('en-GB'), 12)).toBe('12 new messages');
  });

  test('Arabic has a form for zero, one, two, a few and many, with its own digits', () => {
    const arabic = locale('ar-EG');
    expect(message(arabic, 0)).toBe('لا توجد رسائل جديدة');
    expect(message(arabic, 1)).toBe('رسالة جديدة واحدة');
    expect(message(arabic, 2)).toBe('رسالتان جديدتان');
    expect(message(arabic, 3)).toBe('٣ رسائل جديدة');
    expect(message(arabic, 11)).toBe('١١ رسالة جديدة');
  });

  test('Japanese has one form for every count', () => {
    expect(message(locale('ja-JP'), 1)).toBe('新着メッセージ 1件');
  });
});

describe('everywhere', () => {
  test('lays a right-to-left locale out right to left, and counts from the stepper', async () => {
    const app = await render(App, {
      providers: [provideNativeRouter(routes, withComponentInputBinding())],
    });
    await app.componentRef.injector.get(NativeNavigation).push('/world');
    await screen.findByText('3 new messages');
    const arabic = screen.getByText('العربية');
    expect(arabic).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'More' }));
    await screen.findByText('4 new messages');
    await fireEvent(screen.getByLabelText('4 messages'), 'accessibilityAction', {
      actionName: 'decrement',
    });
    await screen.findByText('3 new messages');
  });

  test('says each save in a live region, and takes custom actions', async () => {
    const app = await render(App, {
      providers: [provideNativeRouter(routes, withComponentInputBinding())],
    });
    await app.componentRef.injector.get(NativeNavigation).push('/world');
    await userEvent.press(await screen.findByRole('button', { name: 'Save draft' }));
    const status = await screen.findByText('Saved once');
    expect(status.props['accessibilityLiveRegion']).toBe('polite');
    const item = screen.getByLabelText('Invoice from Kiln, Not flagged, in the inbox');
    await fireEvent(item, 'accessibilityAction', { actionName: 'flag' });
    await screen.findByLabelText('Invoice from Kiln, Flagged, in the inbox');
  });
});
