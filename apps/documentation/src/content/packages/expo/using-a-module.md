---
title: Using a module
summary: Install the Expo module, import its service by entry point, and what happens without it.
---

# Using a module

Installing `@ng-native/expo` itself pulls in no native code at all. You install the actual Expo
module because your app wants that capability, alongside the package that wraps it:

```sh
npm install @ng-native/expo
npm install expo-battery   # only if you're injecting Battery
```

## One entry point per module

**Most of these services have their own entry point** - `@ng-native/expo/battery`,
`@ng-native/expo/haptics`, and so on, one file per module - rather than being re-exported from
the package's own root. That is so that importing haptics never pulls in the video player:

```ts
import { Battery } from '@ng-native/expo/battery';
import { Haptics } from '@ng-native/expo/haptics';
import { Storage, SecureStorage } from '@ng-native/expo/store';
```

Each name is a type as well as a token, so `inject(Clipboard)` and `private clipboard: Clipboard`
both work. Each service is one file: a `@Service()` class that reaches its module through an
injected source token - an `InjectionToken` carrying its own factory - so there is nothing to
provide and nothing to register. Injecting it is the whole setup, and a service nobody injects is
never constructed.

## What happens without the module installed

Each service reaches for its module with a `require()` inside a factory rather than a static
import, so that the module Node cannot load is only ever reached lazily. A file with a static
`import ... from 'expo-battery'` would be unloadable by Node at all - Expo's build output uses
extensionless relative imports, and what it pulls in reaches `react-native`, which is Flow. A
`require` inside a factory does not have that problem, but it does not make the dependency
optional at build time: Metro still resolves the string literal while bundling, so an app that
imports an entry point without installing its module gets a build error from Metro, not a runtime
fallback. In a test, or anywhere else Node evaluates the call directly outside a bundled app,
`require` inside an ESM module throws and the service goes inert instead - the same state as a
device that does not have the thing.

Going inert means the service falls back to reporting nothing, rather than throwing: a level of
`1`, a status of `'unknown'`, an `available` signal of `null`, a method that resolves to `null` or
an empty list. Each module's own page says exactly what its "without the module" behaviour is.
[Crypto](/packages/expo/crypto) is the exception: an empty identifier or hash is a wrong answer
that looks right, so without `expo-crypto` it throws instead.

## What is on the bare import

A handful of exports are not bound to one optional module, so they live on `@ng-native/expo`
itself rather than behind an entry point: [`Permission`](/packages/expo/permissions),
`registerExpoView`, `registerExpoViews`, `registerNativeViews` and `registerExpoUiViews` (see
[Native views](/packages/expo/native-views) and [Expo UI](/packages/expo/expo-ui)), and
`nativeState` (also on the Expo UI page).

## Where everything else lives

Every module has its own page, grouped by what it is for, from the [overview](/packages/expo).
