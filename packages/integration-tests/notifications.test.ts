/**
 * The parts of notifications React was holding.
 *
 * Scheduling, channels, badges and tokens are already plain promises and are not wrapped. What is
 * here is `useLastNotificationResponse` and the two listeners - and in particular the difference
 * between a notification *arriving* and a user *tapping* one, which is a navigation instruction.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Notifications,
  type NativeNotifications,
  type NotificationResponseLike,
  type PushTokenLike,
} from '@ng-native/expo/notifications';
import { serviceWith } from './injected.ts';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const responseTo = (id: string, action = 'default'): NotificationResponseLike => ({
  notification: { request: { identifier: id, content: {} } },
  actionIdentifier: action,
});

function platform(
  launched: NotificationResponseLike | null = null,
  options: { permission?: boolean; expoToken?: string; deviceToken?: PushTokenLike } = {},
) {
  const { permission = true, expoToken = 'ExponentPushToken[abc]', deviceToken } = options;
  const listeners: {
    received?: (n: never) => void;
    response?: (r: never) => void;
    pushToken?: (t: PushTokenLike) => void;
  } = {};
  const native: NativeNotifications & {
    emit(kind: 'received' | 'response' | 'pushToken', value: unknown): void;
  } = {
    onReceived: (listener) => ((listeners.received = listener as never), () => {}),
    onResponse: (listener) => ((listeners.response = listener as never), () => {}),
    lastResponse: async () => launched,
    dismissAll: async () => {},
    setBadge: async () => {},
    getExpoPushToken: async () => (permission ? expoToken : null),
    getDevicePushToken: async () =>
      permission ? (deviceToken ?? { type: 'ios', data: 'x' }) : null,
    onPushTokenChange: (listener) => ((listeners.pushToken = listener), () => {}),
    emit: (kind, value) => (listeners[kind] as (v: unknown) => void)?.(value),
  };
  return native;
}

describe('notifications', () => {
  it('separates one arriving from one being tapped', () => {
    const native = platform();
    const notifications = serviceWith(Notifications.SOURCE, native, () => new Notifications());

    native.emit('received', { request: { identifier: 'a', content: {} } });
    assert.equal(notifications.latest()?.request.identifier, 'a');
    assert.equal(notifications.response(), null, 'arriving is not the user asking for anything');
  });

  it('swallows a native call that fails, rather than leaving an unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const record = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', record);
    try {
      const failing = Object.assign(platform(), {
        lastResponse: () => Promise.reject(new Error('no launch response')),
        dismissAll: () => Promise.reject(new Error('dismiss failed')),
        setBadge: () => Promise.reject(new Error('badge failed')),
      });
      const notifications = serviceWith(Notifications.SOURCE, failing, () => new Notifications());
      notifications.dismissAll();
      notifications.setBadge(3);
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.deepEqual(unhandled, []);
      assert.equal(notifications.response(), null);
    } finally {
      process.off('unhandledRejection', record);
    }
  });

  it('picks up the one that launched the app, which nothing was listening for', async () => {
    // A cold start from a notification: the tap happened before any listener existed. Missing
    // this is the single most common way notification routing is got wrong.
    const notifications = serviceWith(
      Notifications.SOURCE,
      platform(responseTo('launch')),
      () => new Notifications(),
    );
    await settle();
    assert.equal(notifications.response()?.notification.request.identifier, 'launch');
  });

  it('does not let the launch response overwrite one the user just made', async () => {
    const native = platform(responseTo('launch'));
    const notifications = serviceWith(Notifications.SOURCE, native, () => new Notifications());
    native.emit('response', responseTo('newer'));

    await settle();
    assert.equal(notifications.response()?.notification.request.identifier, 'newer');
  });

  it('hands a response over exactly once', async () => {
    // Routing on a tap is a one-off and the signal is not: an effect on it fires again whenever
    // its component is recreated, sending the user back to a screen they navigated away from.
    const notifications = serviceWith(
      Notifications.SOURCE,
      platform(responseTo('launch')),
      () => new Notifications(),
    );
    await settle();

    assert.equal(notifications.take()?.notification.request.identifier, 'launch');
    assert.equal(notifications.take(), null);
  });

  it('hands over the text typed into a reply action', () => {
    const native = platform();
    const notifications = serviceWith(Notifications.SOURCE, native, () => new Notifications());
    native.emit('response', { ...responseTo('chat', 'reply'), userText: 'On my way' });
    const reply: string | undefined = notifications.take()?.userText;
    assert.equal(reply, 'On my way');
  });

  it('hands over a second tap on the same notification', () => {
    // Same notification, tapped again after the app was backgrounded. It is a new instruction.
    const native = platform();
    const notifications = serviceWith(Notifications.SOURCE, native, () => new Notifications());

    native.emit('response', responseTo('a'));
    assert.ok(notifications.take());

    native.emit('response', responseTo('a', 'reply'));
    assert.ok(notifications.take(), 'a different action on the same notification');
  });

  it('is inert rather than broken with no module installed', async () => {
    const notifications = serviceWith(Notifications.SOURCE, null, () => new Notifications());
    assert.equal(notifications.response(), null);
    notifications.dismissAll();
    notifications.setBadge(0);
    assert.equal(await notifications.getExpoPushToken(), null);
    assert.equal(await notifications.getDevicePushToken(), null);
    assert.equal(notifications.devicePushToken(), null);
  });

  it('takes nothing before anything has ever arrived', () => {
    // The ordinary case for most of an app's life: no tap has happened yet, launch or otherwise.
    const notifications = serviceWith(Notifications.SOURCE, platform(), () => new Notifications());
    assert.equal(notifications.take(), null);
  });

  it('dismisses and badges through to the real platform, not just the fake in the inert test', async () => {
    const dismissed: string[] = [];
    const badges: number[] = [];
    const native = platform();
    const notifications = serviceWith(
      Notifications.SOURCE,
      {
        ...native,
        dismissAll: async () => void dismissed.push('all'),
        setBadge: async (count: number) => void badges.push(count),
      },
      () => new Notifications(),
    );

    notifications.dismissAll();
    notifications.setBadge(3);
    await settle();

    assert.deepEqual(dismissed, ['all']);
    assert.deepEqual(badges, [3]);
  });
});

describe('push tokens', () => {
  it('hands back the Expo push token', async () => {
    const notifications = serviceWith(
      Notifications.SOURCE,
      platform(null, { expoToken: 'ExponentPushToken[xyz]' }),
      () => new Notifications(),
    );
    assert.equal(await notifications.getExpoPushToken(), 'ExponentPushToken[xyz]');
  });

  it('passes a projectId through to the source', async () => {
    const seen: (string | undefined)[] = [];
    const native = platform();
    const notifications = serviceWith(
      Notifications.SOURCE,
      {
        ...native,
        getExpoPushToken: async (projectId?: string) => {
          seen.push(projectId);
          return 'token';
        },
      },
      () => new Notifications(),
    );

    await notifications.getExpoPushToken('my-project');
    assert.deepEqual(seen, ['my-project']);
  });

  it('hands back the native device token, for a backend that talks to APNs/FCM directly', async () => {
    const notifications = serviceWith(
      Notifications.SOURCE,
      platform(null, { deviceToken: { type: 'android', data: 'fcm-token' } }),
      () => new Notifications(),
    );
    assert.deepEqual(await notifications.getDevicePushToken(), {
      type: 'android',
      data: 'fcm-token',
    });
  });

  it('is null when the permission was refused', async () => {
    const notifications = serviceWith(
      Notifications.SOURCE,
      platform(null, { permission: false }),
      () => new Notifications(),
    );
    assert.equal(await notifications.getExpoPushToken(), null);
    assert.equal(await notifications.getDevicePushToken(), null);
  });

  it('is null with no module installed, for both kinds of token', async () => {
    const notifications = serviceWith(Notifications.SOURCE, null, () => new Notifications());
    assert.equal(await notifications.getExpoPushToken(), null);
    assert.equal(await notifications.getDevicePushToken(), null);
  });

  it('observes the device token changing while the app runs', () => {
    const native = platform();
    const notifications = serviceWith(Notifications.SOURCE, native, () => new Notifications());
    assert.equal(notifications.devicePushToken(), null, 'nothing has rolled yet');

    native.emit('pushToken', { type: 'ios', data: 'rolled-token' });
    assert.deepEqual(notifications.devicePushToken(), { type: 'ios', data: 'rolled-token' });
  });
});
