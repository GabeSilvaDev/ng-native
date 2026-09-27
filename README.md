# Angular Native

**Angular apps, rendered as real native iOS and Android views.**

Angular Native renders Angular components straight onto React Native's Fabric renderer, so a
`<view>` is a `UIView` on iOS and an `android.view.View` on Android, and React is never in the render
path. You write standalone components, signals, Signal Forms and `@angular/router` routes as you
would for the web, then create, run, hot reload and ship the app with Expo.

```sh
npx create-expo-app@latest my-app --template @ng-native/template
cd my-app && npx expo start
```

Scan the QR code with Expo Go, or press `i` or `a` for a simulator.

## A component

```ts
import { Component, signal } from '@angular/core';
import { Pressable, SafeAreaView, Text } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Pressable, SafeAreaView, Text],
  template: `
    <safe-area-view class="screen">
      <text class="title">Angular, natively</text>
      <pressable accessibilityRole="button" class="button" (press)="count.set(count() + 1)">
        <text class="label">Tapped {{ count() }} times</text>
      </pressable>
    </safe-area-view>
  `,
  styles: `
    :host {
      flex: 1;
    }
    .screen {
      flex: 1;
      justify-content: center;
      gap: 12px;
      padding: 24px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
    }
    .button {
      padding: 14px;
      border-radius: 10px;
      background-color: #3b6ef5;
      align-items: center;
    }
    .button:active {
      opacity: 0.8;
    }
    .label {
      color: white;
      font-weight: 600;
    }
  `,
})
export class App {
  protected readonly count = signal(0);
}
```

Elements are Angular components imported like any other, with lowercase names. Stylesheets compile
to native styles at build time.

## Features

- **Native rendering.** An incremental renderer commits only what changed to Fabric, with native
  text, images, scroll views, virtual and section lists, text inputs, switches, modals and gestures.
- **CSS and Tailwind.** Component stylesheets, CSS variables, media queries, dark mode,
  transitions and `@keyframes`, plus a Tailwind preset with `ios:` and `android:` variants.
- **Native navigation.** `@angular/router` over native stacks, tabs, headers, modals and sheets,
  with guards, resolvers, lazy routes and deep links.
- **Forms.** Signal Forms bound to native controls.
- **Expo modules as Angular services.** Camera, location, notifications, secure storage, the file
  system, SQLite, biometrics, maps, haptics and more, injected like any other service.
- **Animation.** `animate.enter` and `animate.leave`, CSS transitions, `Animated` and Reanimated
  worklets.
- **Testing.** A Testing Library API that runs components in Node against a fake Fabric, with no
  simulator.
- **Fits existing workspaces.** Generators for the Angular CLI (`ng add @ng-native/schematics`) and
  Nx (`nx add @ng-native/nx`).
- **The web too.** `@ng-native/web` renders the same components to the DOM.

## Documentation

- [Getting started](apps/documentation/src/content/guide/getting-started.md)
- [Adding it to an existing app](apps/documentation/src/content/guide/manual-setup.md)
- [Theming and Tailwind](apps/documentation/src/content/guide/theming.md)
- [Build a form](apps/documentation/src/content/guide/forms.md)
- [Shipping to a device and the store](apps/documentation/src/content/guide/shipping.md)
- [How it compares](apps/documentation/src/content/guide/comparison.md)
- [Known limitations](apps/documentation/src/content/guide/limitations.md)
- [Architecture](ARCHITECTURE.md)

The [examples](examples) are complete apps: a bank (`wallet`), a habit tracker (`habits`), a music
player (`music`), a run tracker with maps (`runs`) and a notes app (`notes`).

## Packages

| Package                 | What it provides                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `@ng-native/platform`   | `mount()`, the Angular renderer, and `HttpClient` for React Native.                |
| `@ng-native/components` | The elements: views, text, images, lists, inputs, pressables, gestures, animation. |
| `@ng-native/router`     | Native stack and tab navigation over `@angular/router`.                            |
| `@ng-native/device`     | Keyboard, screen, colour scheme, app state, accessibility, deep links and more.    |
| `@ng-native/expo`       | Expo's modules as Angular services and directives.                                 |
| `@ng-native/icons`      | `<ng-icon>` with the `@ng-icons` sets, drawn as native SVG.                        |
| `@ng-native/metro`      | The Metro preset: the Angular compiler, the CSS compiler and hot reload.           |
| `@ng-native/tailwind`   | The Tailwind preset and its platform variants.                                     |
| `@ng-native/testing`    | Testing Library for Angular Native, running in Node.                               |
| `@ng-native/web`        | A DOM renderer for the same components, with a Vite preset.                        |
| `@ng-native/schematics` | `ng add` and `ng generate` for Angular CLI workspaces.                             |
| `@ng-native/nx`         | `nx add` and an app generator for Nx workspaces.                                   |
| `@ng-native/fabric`     | The framework-agnostic retained tree and commit engine the renderer is built on.   |

## Requirements

Angular 22, Expo SDK 57 and React Native 0.86 with the New Architecture, on Node 22.18 or later.

## Status

Angular Native is in alpha, so APIs can change between `0.x` releases. Many of the platform
services are unit-tested and typechecked but have not run on hardware, and Android is checked less
often than iOS. The [known limitations](apps/documentation/src/content/guide/limitations.md) list
every gap with its workaround.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setting up the workspace, running the tests and what a
pull request needs. Report a vulnerability privately, as [SECURITY.md](SECURITY.md) describes.
Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Licence

[MIT](LICENSE)

Angular Native is an independent open-source project. It is not affiliated with or endorsed by
Google, the Angular team or Expo. Angular is a trademark of Google LLC.
