import { Notifications, type NativeNotifications } from '@ng-native/expo/notifications';
import { fireEvent, render, screen, waitFor } from '@ng-native/testing';
import { expect, test } from 'vitest';
import { Settings } from './settings.ts';

/** The slice of expo-notifications this screen reaches, recording what it was asked to do. */
function notifications(granted: boolean) {
  const calls: unknown[][] = [];
  const status = { status: granted ? 'granted' : 'denied', granted, canAskAgain: false };
  const subscription = { remove: () => {} };
  const native = {
    addNotificationReceivedListener: () => subscription,
    addNotificationResponseReceivedListener: () => subscription,
    addNotificationsDroppedListener: () => subscription,
    addPushTokenListener: () => subscription,
    getLastNotificationResponseAsync: async () => null,
    getPermissionsAsync: async () => status,
    requestPermissionsAsync: async () => status,
    cancelAllScheduledNotificationsAsync: async () => void calls.push(['cancelAll']),
    scheduleNotificationAsync: async (request: unknown) => {
      calls.push(['schedule', request]);
      return 'id';
    },
  } as unknown as NativeNotifications;
  return { native, calls };
}

async function open(granted: boolean) {
  const fake = notifications(granted);
  await render(Settings, { providers: [{ provide: Notifications.SOURCE, useValue: fake.native }] });
  const reminders = await screen.findByRole('switch', { name: 'Daily reminders' });
  return { ...fake, reminders };
}

test('turning reminders on schedules one a day for each habit with a time', async () => {
  const { calls, reminders } = await open(true);
  await fireEvent(reminders, 'change', { value: true });
  await waitFor(() => expect(calls.filter(([kind]) => kind === 'schedule')).toHaveLength(3));
  expect(calls[0]).toEqual(['cancelAll']);
  expect(calls[1]).toEqual([
    'schedule',
    {
      identifier: 'seed-water',
      content: { title: 'Drink water', body: "Don't forget today." },
      trigger: { type: 'daily', hour: 9, minute: 0 },
    },
  ]);
});

test('refused, it schedules nothing and says where to turn them on', async () => {
  const { calls, reminders } = await open(false);
  await fireEvent(reminders, 'change', { value: true });
  await screen.findByText(/Notifications are turned off for Habits/);
  expect(calls).toEqual([]);
});

test('turning reminders off cancels them', async () => {
  const { calls, reminders } = await open(true);
  await fireEvent(reminders, 'change', { value: true });
  await waitFor(() => expect(calls.length).toBeGreaterThan(1));
  calls.length = 0;
  await fireEvent(reminders, 'change', { value: false });
  await waitFor(() => expect(calls).toEqual([['cancelAll']]));
});
