---
title: The native header
summary: NativeHeader and NativeHeaderItem, where their default colours come from, and withHeaderDefaults.
---

# The native header

A screen that wants a navigation bar declares `<native-header>` in its template:

<!-- api: NativeHeader -->

```ts
@Component({
  selector: 'x-detail',
  imports: [NativeHeader, NativeHeaderItem /* ... */],
  template: `
    <native-header title="Detail" backTitle="Back" [largeTitle]="true">
      <native-header-item type="right">
        <pressable (press)="star()"><text>★</text></pressable>
      </native-header-item>
    </native-header>
    <!-- the rest of the screen -->
  `,
})
export class Detail {}
```

The header can go anywhere in the screen: at the top level, inside a `<safe-area-view>` or a
`@if`, or in a layout component the page renders. Native only looks for it among the screen's
direct children, so that is where it is committed: just after the part of the page it was written
in, or after the rest of the page when it was written at the top level. Everything else about it,
its bindings and its `@if` included, behaves where you wrote it. Write one header per screen.

## Large titles

A large title collapses into the bar as the page scrolls when the page's scroll view comes first
in the screen, with nothing wrapped around or ahead of it, and adjusts its insets for the bar:

```html
<native-header title="Library" [largeTitle]="true" />
<scroll-view contentInsetAdjustmentBehavior="automatic">
  <!-- ... -->
</scroll-view>
```

`<virtual-list>` takes the same input. Put anything that belongs above the rows, such as a row of
filters, in its `listHeader` rather than ahead of the list. On iOS a header with a large title is
translucent, with a clear, unlined bar at the top of the content (`largeTitleBackgroundColor` is
`transparent` and `largeTitleHideShadow` is `true`), which is how UIKit draws one; binding any of
those, or setting them in `withHeaderDefaults`, takes precedence.

A header an `@if` takes away leaves the screen with no navigation bar, the same as a screen that
never had one, and a header that comes back brings its bar back. Native keeps the bar it was last
told about until a header config says otherwise, so once a screen has had a header it keeps one
config for the rest of its life: removing the header commits that config as hidden, and the next
header on the screen takes it over. `[hidden]` does the same for a bar that should go and come
back with the same header in place.

`<native-header-item>` places arbitrary Angular content - not just text - into one of the bar's
slots: `left`, `center`/`title`, `right`, `back` (replaces the chevron; needs
`backButtonInCustomView` on the header), or `searchBar`. Press handling is the ordinary responder
system, so a `pressable` inside one works like anywhere else.

<!-- api: NativeHeaderItem -->

## Colours

A header prop cannot read the cascade, so left alone each platform chooses for itself: iOS follows
the system appearance, and Android takes the app theme's `colorPrimary` - the framework blue on
every screen. `NativeHeader` closes that gap by defaulting `backgroundColor`, `color` and
`titleColor` to a neutral background/foreground pair for the current colour scheme, so a bar
matches the screen under it without anything bound. `NATIVE_HEADER_PALETTE` overrides those
defaults for an app that retunes its palette:

```ts
providers: [
  {
    provide: NATIVE_HEADER_PALETTE,
    useValue: {
      light: { background: '#ffffff', foreground: '#0a0a0a' },
      dark: { background: '#0a0a0a', foreground: '#fafafa' },
    },
  },
],
```

Binding `backgroundColor`, `color` or `titleColor` on a particular `<native-header>` still wins
over the palette - the token only fills in what a call site left unset.

## Defaults for every header

An app whose bars should match its pages would otherwise repeat the same bindings on every
`<native-header>`. `withHeaderDefaults` says them once, beside the routes:

```ts
import { provideNativeRouter, withHeaderDefaults } from '@ng-native/router';
import { routes } from './routes.ts';

export const providers = [
  provideNativeRouter(
    routes,
    withHeaderDefaults((scheme) => ({
      backgroundColor: scheme === 'dark' ? '#101014' : '#f4f4f7',
      titleColor: scheme === 'dark' ? '#ffffff' : '#101014',
      largeTitleColor: scheme === 'dark' ? '#ffffff' : '#101014',
      color: '#3b6ef5',
      userInterfaceStyle: scheme,
      hideShadow: true,
    })),
  ),
];
```

Pass an object for defaults that never change, or a function of the colour scheme - `'light'` or
`'dark'`, from `ColorScheme` in `@ng-native/device` - for ones that follow the system appearance,
the way a page's `@media (prefers-color-scheme: dark)` rules do. The function runs inside a
`computed`, so a signal it reads, such as an in-app theme setting, is followed too.

The defaults cover the header's appearance: `userInterfaceStyle`, `backgroundColor`, `color`,
`blurEffect`, `hideShadow`, `translucent`, the `title*` and `largeTitle*` colours and fonts,
`largeTitleHideShadow`, `backTitleFontFamily`, `backTitleFontSize` and `backButtonDisplayMode`.
What a screen says about itself - its title, whether it has a large title, whether the bar is
hidden - stays on the screen.

Each `<native-header>` still overrides: anything it binds, including an explicit `false`, wins
over the defaults. A colour the defaults leave out falls back to `NATIVE_HEADER_PALETTE`.

## Insets

A header owns the top safe-area inset, so a screen that has one should not also wrap itself in a
`<safe-area-view>` - that would clear the notch twice. And a screen opened with `present()` has no
header at all, because it sits outside the navigation controller the header configures; see
[Screens and navigation](/packages/router/screens) for what such a screen owns instead.
