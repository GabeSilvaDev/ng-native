/**
 * `Notifications`, bound to `expo-notifications`: the two that arrive while the app is running,
 * the one that started it, and the push token a server needs to send either.
 *
 * Almost all of `expo-notifications` is already plain promises - scheduling, channels and badges
 * among them - and none of that is wrapped here. An app calls those on the module directly:
 *
 * ```ts
 * import * as Expo from 'expo-notifications';
 * import { Permission } from '@ng-native/expo';
 * import { Notifications } from '@ng-native/expo/notifications';
 *
 * private readonly inbox = inject(Notifications);
 * readonly permission = Permission.of(Expo.getPermissionsAsync, Expo.requestPermissionsAsync);
 *
 * constructor() {
 *   const tapped = this.inbox.take();
 *   if (tapped) this.router.navigateByUrl(routeFor(tapped));
 * }
 * ```
 *
 * The distinction the two listeners draw is the whole thing. *Received* is a notification arriving
 * while the app is in front; the app usually decides whether to show anything. *Responded* is the
 * user having tapped one, which is a navigation instruction and must not be missed - including the
 * one that launched the app, which arrived before anything was listening.
 *
 * The token methods are wrapped, unlike the rest, because getting one right needs the permission
 * asked for first and a module that might not be installed handled the same way everything else
 * here handles it - both easy to get wrong once and never notice, because the failure is a push
 * that silently never arrives.
 */
import { DestroyRef, InjectionToken, Service, inject, signal, type Signal } from '@angular/core';
import { optional } from './native.ts';
import { Permission } from './permissions.ts';

/** Enough of a notification to route on. The module's own types carry the rest. */
export interface NotificationLike {
  readonly request: { readonly identifier: string; readonly content: unknown };
}

export interface NotificationResponseLike {
  readonly notification: NotificationLike;
  readonly actionIdentifier: string;
}

/** A push token as the platform hands it over: `expo` for Expo's service, `ios`/`android` native. */
export interface PushTokenLike {
  readonly type: string;
  readonly data: unknown;
}

export interface NativeNotifications {
  onReceived(listener: (notification: NotificationLike) => void): () => void;
  onResponse(listener: (response: NotificationResponseLike) => void): () => void;
  /** What the app was launched by, if it was. Resolves to null on an ordinary start. */
  lastResponse(): Promise<NotificationResponseLike | null>;
  dismissAll(): Promise<void>;
  setBadge(count: number): Promise<void>;
  /** Null without the permission granted. `projectId` defaults to the app's EAS project. */
  getExpoPushToken(projectId?: string): Promise<string | null>;
  /** The raw APNs/FCM token, for an app that talks to those services directly. Null without permission. */
  getDevicePushToken(): Promise<PushTokenLike | null>;
  onPushTokenChange(listener: (token: PushTokenLike) => void): () => void;
}

@Service()
export class Notifications {
  /** Overridden in a test to deliver a notification nobody sent. */
  static readonly SOURCE = new InjectionToken<NativeNotifications | null>(
    'angular-native.notificationsSource',
    {
      factory: () => {
        const expo = optional(
          () => require('expo-notifications') as typeof import('expo-notifications'),
        );
        if (!expo) return null;
        const permission = Permission.of(expo.getPermissionsAsync, expo.requestPermissionsAsync);
        return {
          onReceived: (listener) => {
            const subscription = expo.addNotificationReceivedListener((n) => listener(n));
            return () => subscription.remove();
          },
          onResponse: (listener) => {
            const subscription = expo.addNotificationResponseReceivedListener((r) => listener(r));
            return () => subscription.remove();
          },
          lastResponse: async () =>
            (await expo.getLastNotificationResponseAsync()) as NotificationResponseLike | null,
          dismissAll: () => expo.dismissAllNotificationsAsync(),
          setBadge: async (count) => void (await expo.setBadgeCountAsync(count)),
          getExpoPushToken: async (projectId) => {
            if (!(await permission.ensure())) return null;
            const token = await expo.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
            return token.data;
          },
          getDevicePushToken: async () => {
            if (!(await permission.ensure())) return null;
            return (await expo.getDevicePushTokenAsync()) as PushTokenLike;
          },
          onPushTokenChange: (listener) => {
            const subscription = expo.addPushTokenListener((token) => listener(token));
            return () => subscription.remove();
          },
        };
      },
    },
  );

  private readonly native = inject(Notifications.SOURCE);
  private readonly received = signal<NotificationLike | null>(null);
  private readonly responded = signal<NotificationResponseLike | null>(null);
  private readonly rolled = signal<PushTokenLike | null>(null);
  private readonly handled = new Set<string>();

  constructor() {
    const native = this.native;
    if (!native) return;
    const stops = [
      native.onReceived((notification) => this.received.set(notification)),
      native.onResponse((response) => this.responded.set(response)),
      // A device push token can be rolled by the platform while the app is running; the old one
      // then fails silently rather than delivering anything. This is the only way to find out.
      native.onPushTokenChange((token) => this.rolled.set(token)),
    ];
    inject(DestroyRef).onDestroy(() => stops.forEach((stop) => stop()));
    // The response that launched the app happened before anything was listening, so it has to be
    // asked for rather than waited for. Without this a cold start from a notification does
    // nothing, which is the single most common way this is got wrong.
    // A platform that cannot say is the same as a launch without a notification.
    void native
      .lastResponse()
      .then((response) => {
        if (response && this.responded() === null) this.responded.set(response);
      })
      .catch(() => {});
  }

  /** The most recent notification that arrived while the app was in front. */
  readonly latest: Signal<NotificationLike | null> = this.received.asReadonly();

  /**
   * The most recent notification the user tapped, including the one that launched the app.
   *
   * A router usually wants `take()` instead: this stays set, so a screen that reacts to it will
   * react again every time it is created.
   */
  readonly response: Signal<NotificationResponseLike | null> = this.responded.asReadonly();

  /**
   * The response, once.
   *
   * Routing on a tap is a one-off, and the signal is not: an effect on it fires again whenever
   * its component is recreated, which sends the user back to a screen they navigated away from.
   */
  take(): NotificationResponseLike | null {
    const response = this.responded();
    if (!response) return null;

    const id = response.notification.request.identifier + response.actionIdentifier;
    if (this.handled.has(id)) return null;
    this.handled.add(id);
    return response;
  }

  dismissAll(): void {
    void this.native?.dismissAll().catch(() => {});
  }

  /** iOS shows this on the icon; Android shows it where the launcher supports it. */
  setBadge(count: number): void {
    void this.native?.setBadge(count).catch(() => {});
  }

  /**
   * The token to hand a backend so it can send a push through Expo's service.
   *
   * Asks for the notification permission first - a token nobody can be shown anything with is not
   * worth having. `projectId` defaults to the app's own EAS project; pass it explicitly for a bare
   * workflow app, one still without EAS Build configured, or a token fetched outside `expo-notifications`'
   * default resolution. Null without the permission or without the module.
   */
  async getExpoPushToken(projectId?: string): Promise<string | null> {
    return (await this.native?.getExpoPushToken(projectId)) ?? null;
  }

  /**
   * The raw APNs (iOS) or FCM (Android) token, for a backend that talks to those services
   * directly rather than through Expo's push service. Same permission and module rules as
   * {@link getExpoPushToken}.
   */
  async getDevicePushToken(): Promise<PushTokenLike | null> {
    return (await this.native?.getDevicePushToken()) ?? null;
  }

  /**
   * The device push token, each time the platform rolls it while the app is running.
   *
   * A rolled token is not the one a backend has on file, and sending to the old one fails
   * silently - this is what tells an app to register the new one. Unset until a roll happens;
   * most of an app's life this stays null.
   */
  readonly devicePushToken: Signal<PushTokenLike | null> = this.rolled.asReadonly();
}
