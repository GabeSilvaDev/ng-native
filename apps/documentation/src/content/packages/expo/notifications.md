---
title: Notifications
summary: The notification that launched the app, the one just tapped, and a push token for your server.
---

# Notifications

`Notifications` exposes received notifications, notification taps and the response that launched
the app through `expo-notifications`.

Almost all of `expo-notifications` is already plain promises - scheduling, channels, badges - and
none of that is wrapped here. Call those on the module directly. What is here is the part that was
only reachable through a hook - the difference between a notification _arriving_ while the app is
in front, and a user _tapping_ one, which is a navigation instruction and must not be missed,
including the one that launched the app, which arrived before anything was listening - plus the
push token a server needs to send either kind, which needs the permission asked for first and a
missing module handled the same way everything else here handles it.

## Install

```sh
npx expo install expo-notifications
```

```ts
import { Notifications } from '@ng-native/expo/notifications';
```

## The smallest useful example

```ts
import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NativeStackOutlet } from '@ng-native/router';
import { Notifications } from '@ng-native/expo/notifications';

@Component({
  selector: 'app-root',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class App {
  private readonly inbox = inject(Notifications);
  private readonly router = inject(Router);

  constructor() {
    // `take()` reads a signal, and the response that launched the app arrives asynchronously -
    // an effect re-runs when it does, where a one-off read in the constructor would miss it.
    effect(() => {
      const tapped = this.inbox.take();
      if (tapped)
        this.router.navigateByUrl('/notification/' + tapped.notification.request.identifier);
    });
  }
}
```

Pair it with `Permission.of(getPermissionsAsync, requestPermissionsAsync)` from the module itself -
see [permissions](/packages/expo/permissions).

## What it reports and does

- **`latest`** - a signal: the most recent notification that arrived while the app was in front.
- **`response`** - a signal: the most recent notification the user tapped, including the one that
  launched the app. It stays set once populated, so an effect that reads it fires again every time
  its component is recreated.
- **`take()`** - the response, once. Prefer this over reading `response` directly for routing:
  routing on a tap is a one-off, and the signal is not. Each response is keyed by its notification
  identifier plus its action identifier, so `take()` returns it exactly once and returns `null` on
  every call after. Further responses with the same notification and action identifiers return
  `null` for the lifetime of the service.
- **`dismissAll()`** - clears every currently displayed notification.
- **`setBadge(count)`** - sets the app icon's badge count. iOS shows it on the icon; Android shows
  it where the launcher supports it.
- **`getExpoPushToken(projectId?)`** and **`getDevicePushToken()`** - the two push tokens, covered
  below.
- **`devicePushToken`** - a signal: the device token, each time the platform rolls it while the app
  is running. Null until a roll happens.

## The response that launched the app

The response that started a cold launch happened before any listener existed, so it cannot be
waited for - it has to be asked for. `Notifications` does this on construction, and only sets
`response` from it if nothing else has already arrived. Missing this is the single most common way
notification routing is got wrong: an app that only listens for new taps does nothing on a cold
start from a notification.

## Without the module installed

`latest` and `response` stay `null`, `take()` always returns `null`, `dismissAll()` and
`setBadge()` do nothing, and both push token methods resolve to `null`.

## Push notifications from your server

Getting a push to a device from your own backend is three things: a token that identifies the
device to a push service, sending that token to your server, and your server calling a push
service with it. Nothing here runs a push service - Expo's is the easy route, and a device token
lets you skip it and talk to APNs/FCM yourself.

### App configuration

Before any of this works, the app needs configuring. All of it is `app.json`/`app.config.ts` and
native project settings, not this package:

- **An EAS project.** `getExpoPushTokenAsync()` needs a `projectId` to attribute the token to your
  app. Run `eas init` (or `eas build:configure`) once and it writes `extra.eas.projectId` into your
  app config - `Notifications.getExpoPushToken()` picks it up from there with no argument needed.
  Pass a `projectId` explicitly only for a bare workflow app, or one without EAS Build configured
  at all.
- **iOS: the Push Notifications capability**, and, for a background handler, the
  `remote-notification` background mode. EAS Build adds the capability automatically once
  `expo-notifications` is installed; a bare workflow app enables it in Xcode under **Signing &
  Capabilities**. Sending through Expo's service still needs your APNs key uploaded to Expo's
  servers (`eas credentials`) - _unverified on a device in this change_.
- **Android: Firebase Cloud Messaging**, which means a `google-services.json` from a Firebase
  project, referenced from `app.json`'s `android.googleServicesFile`. Expo's push service holds
  Firebase's own server key on your behalf once that file is in place; a device push token (FCM
  directly) needs nothing beyond the file. _Unverified on a device in this change._

None of this is checked at build time - a missing `projectId` surfaces as `getExpoPushToken()`
rejecting, and a missing FCM config surfaces as a token that silently never arrives on Android.

### Getting the token

Ask for the notification permission and fetch a token in the same place - `getExpoPushToken()`
does the asking for you:

```ts
import { Component, inject } from '@angular/core';
import { Notifications } from '@ng-native/expo/notifications';

@Component({ selector: 'app-root', template: `...` })
export class Root {
  private readonly notifications = inject(Notifications);

  async registerForPush(): Promise<void> {
    const token = await this.notifications.getExpoPushToken();
    if (!token) return; // permission refused, or expo-notifications is not installed
    // send `token` to your server - see below
  }
}
```

`getExpoPushToken(projectId?)` asks the notification permission first (see
[permissions](/packages/expo/permissions)) and resolves to `null` rather than throwing when it is
refused, or when `expo-notifications` is not installed - the same "inert, not broken" contract
every service in this package follows. Refused or missing are the only two things it swallows: a
real failure, such as no EAS project configured or the device being offline, still rejects the
promise, so wrap the call in `try`/`catch` if you want to retry rather than surface it.

If your backend talks to APNs or FCM directly instead of through Expo's push service, use
`getDevicePushToken()` for the raw native token:

```ts
const native = await this.notifications.getDevicePushToken();
// { type: 'ios', data: '<hex APNs token>' } or { type: 'android', data: '<FCM token>' }
```

Same permission and missing-module rules as `getExpoPushToken()`. Most apps want the Expo token,
not this one - reach for it only if you are not using Expo's push service at all.

A push token can be rolled by the platform while the app is running, and the old one then fails
silently rather than delivering anything. `devicePushToken` is a signal that updates when that
happens, so an effect on it is the way to notice and re-register:

```ts
import { effect, inject } from '@angular/core';
import { Notifications } from '@ng-native/expo/notifications';

private readonly notifications = inject(Notifications);

constructor() {
  effect(() => {
    const rolled = this.notifications.devicePushToken();
    if (rolled) void this.registerWithServer(rolled);
  });
}
```

### Sending the token to your server

Use `HttpClient` with `provideNativeHttpClient()` - plain `provideHttpClient()` fails silently on
a device, because its default `fetch` backend cannot read a React Native response body. See
[Known limitations](/guide/limitations#httpclient-needs-providenativehttpclient) for why.

```ts
import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Service()
export class PushRegistration {
  private readonly http = inject(HttpClient);

  register(userId: string, expoPushToken: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>('https://example.com/push-tokens', { userId, expoPushToken }),
    );
  }
}
```

```ts
import { provideNativeHttpClient } from '@ng-native/platform/http';

mount(rootTag, App, getFabricUIManager(), {
  providers: [provideNativeHttpClient()],
});
```

Call `register()` after `getExpoPushToken()` resolves, and again from the `devicePushToken` effect
above when the platform rolls the token - a server holding the old one is a push that silently
never arrives, the same failure mode as a missing FCM config.

### Receiving a push

A push that arrives while the app is in front is `latest` - the same signal a local notification
would set, because from `expo-notifications`'s perspective there is no difference once it has
arrived:

```ts
import { effect, inject } from '@angular/core';
import { Notifications } from '@ng-native/expo/notifications';

private readonly notifications = inject(Notifications);

constructor() {
  effect(() => {
    const notification = this.notifications.latest();
    if (notification) this.showInAppBanner(notification);
  });
}
```

What the platform does with a push while the app is backgrounded or killed is not this package's
concern - iOS and Android decide whether to show it in the system tray based on the payload's
priority/`content-available` flags, which is between your server and the push service, not
something `expo-notifications` mediates on the way in. _Unverified on a device in this change_:
confirm your server's payload shape shows a system notification with the app backgrounded, using
[Expo's push notification tool](https://expo.dev/notifications) or the `curl` example below.

### Handling the tap

A tapped notification - foreground, background, or the one that launched the app from cold - is
`response`, and `take()` is what most routing code wants, as in the smallest useful example above.

```ts
import { effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Notifications } from '@ng-native/expo/notifications';

private readonly notifications = inject(Notifications);
private readonly router = inject(Router);

constructor() {
  effect(() => {
    const response = this.notifications.take();
    if (!response) return;
    const url = response.notification.request.content as { data?: { url?: string } };
    if (url.data?.url) this.router.navigateByUrl(url.data.url);
  });
}
```

Put the route in the push payload's `data` field on the server side - `{ to: '/push', body: { data:
{ url: '/notes/42' } } }` for Expo's push API - and read it back out of
`response.notification.request.content` here. This is the same cold-start case
`Notifications.take()` exists for: the response that launched the app arrived before this effect
was listening, and `take()` still returns it once.

### Sending a test push

With an Expo push token in hand, [Expo's push notification tool](https://expo.dev/notifications)
sends one without any server code. To do the same from a terminal:

```sh
curl -H "Content-Type: application/json" -X POST "https://exp.host/--/api/v2/push/send" \
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "Test",
    "body": "Hello from curl",
    "data": { "url": "/notes/42" }
  }'
```

For a device push token instead, send through APNs or FCM's own HTTP API directly - Expo's push
service has no part in that path. _Both the curl example and a real send have not been run against
a device for this change; verify the token format and response shape before relying on them._

## Reference

<!-- api: Notifications -->
