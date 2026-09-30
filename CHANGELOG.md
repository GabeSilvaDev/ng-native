## 0.1.3 (2026-09-30)

### 🚀 Features

- A text's `font-weight` and `font-style` now pick the matching declared `@font-face`, as they do on the web. Once a node's style is resolved, a `font-family` naming a declared family is pointed at the face CSS's matching rules choose (closest style, then nearest weight), so `font-family: Inter; font-weight: 600` or `class="font-sans font-semibold"` draws the file declared for 600 rather than the regular face made bold on iOS, or Roboto on Android. A face with both a weight and a style is registered as `<family>-<weight>-<style>` (`Inter-600-italic`), and no longer overwrites `Inter-600` or `Inter-italic` when a face declared exactly that exists. `font-weight: bold` in an `@font-face` is now read as 700; it was dropped. ([#71](https://github.com/ng-native/ng-native/pull/71), [#51](https://github.com/ng-native/ng-native/issues/51))

### 🩹 Fixes

- The app that the starter template, `nx g @ng-native/nx:app` and `ng add @ng-native/schematics` generate now wraps its `<safe-area-view>` in a `<safe-area-provider>`, so its content is inset from the first frame on iOS instead of jumping into place after the first relayout. ([#79](https://github.com/ng-native/ng-native/pull/79), [#78](https://github.com/ng-native/ng-native/issues/78))

  Without a provider above it, a `<safe-area-view>` reads its own insets once, before it has been laid out, and gets zero. An app generated earlier can make the same change in `src/app/app.ts`: add `SafeAreaProvider` to `imports` and put `<safe-area-provider>` around the template.

- A disabled `<pressable>`, `<touchable-opacity>`, `<switch>` or `PressBehavior` host now publishes `data-disabled`, so `[data-disabled]` rules and Tailwind's `disabled:`, `group-disabled:` and `peer-disabled:` variants apply to it, and stop applying when it is enabled again. ([#95](https://github.com/ng-native/ng-native/pull/95), [#90](https://github.com/ng-native/ng-native/issues/90), [#91](https://github.com/ng-native/ng-native/issues/91))

  `:disabled` still does not match a pressable, a touchable-opacity or a `PressBehavior` host: their `disabled` is an input, not a prop left on the node, so style them with `[data-disabled]` or `disabled:`. A `<switch>` matches both, because it also sends `disabled` to native.

  `fabric.render({ props: true })` in `@ng-native/testing` now prints nested props in full, with keys sorted at every depth. It printed a nested object such as `accessibilityState` as `{}` (keeping only nested keys that happened to share a name with a top-level prop), so a disabled control looked as if it announced nothing while `getByRole(...).props`, which reads the same commit, showed `disabled: true`. What native receives has not changed. A snapshot or golden string of this output that contains a nested prop needs updating.

- A custom property set on an element to another token, `[style.--fill-color]="'var(--brand)'"` or `style="--fill-color: var(--brand)"`, now resolves to that token where it is set, following a theme or an ancestor that redefines it, instead of the rules that read it drawing nothing. ([#96](https://github.com/ng-native/ng-native/pull/96), [#93](https://github.com/ng-native/ng-native/issues/93))

  The value can have a fallback, written or itself a `var()`: `var(--missing, var(--brand))`. A fallback that is another `var()` now also works for a custom property defined in a stylesheet, and a chain of aliases, such as `--a: var(--b); --b: var(--c)`, now resolves when it ends at a token built from others, such as `--c: hsl(var(--hue), 100%, 50%)`, declared in the same rule. Custom properties in a cycle, such as `--a: var(--b); --b: var(--a)`, are all invalid, as in a browser, so a rule that reads one takes its own fallback; before, one in the cycle could take its fallback instead. A `var()` inside another value set on an element, such as `calc(var(--gap) * 2)`, is still not resolved.

- An italic or oblique `font-style` that no declared `@font-face` of the family covers is no longer sent to native once a face is matched. Both platforms draw the upright face, rather than Android dropping the custom font for its system font in italic. ([#88](https://github.com/ng-native/ng-native/pull/88))
- A text input whose `@font-face` registers after it was laid out switches to that face, in its value and its placeholder, instead of keeping the system font. ([#87](https://github.com/ng-native/ng-native/pull/87))

  A text input takes its font a different way from a paragraph. iOS sets the font on the field again only when the input's text attributes change, and Android only when `fontFamily` is in the props the input is sent. Each text input that names a newly registered family is now committed with its `maxFontSizeMultiplier` moved by the same step as a paragraph's, and with its `fontFamily` sent again once. It keeps its view, so its focus, its typed text and its cursor position stay where they were.

- Text laid out before its `@font-face` registers switches to that face when `loadFonts()` or `Fonts.load()` registers it, instead of keeping the system font until its content changes. ([#82](https://github.com/ng-native/ng-native/pull/82), [#75](https://github.com/ng-native/ng-native/issues/75))

  React Native caches a paragraph's text layout by what the paragraph asks for, so a paragraph committed again unchanged kept the fallback face it was first laid out in. Each paragraph that names a newly registered family is now committed with its `maxFontSizeMultiplier` moved by a step no text size reaches, so native lays it out again in the same view. It keeps its tag and native state. An app that sets its own `maxFontSizeMultiplier` sees it rise by 0.006 for each such face, which makes no visible difference.

- `withAngularNative` now resolves a package a workspace library imports to the app's copy when the library's copy is the same version in another directory, so the bundle holds one `@ng-native/components`, one React Native and one of each native module. ([#97](https://github.com/ng-native/ng-native/pull/97), [#92](https://github.com/ng-native/ng-native/issues/92))

  pnpm installs a package once per set of peers it resolves. A library that lists
  `@ng-native/components` but not everything the app lists, such as `@babel/core`, gets its own
  peer context, and a second directory for every package in it at the app's versions. Metro bundled
  those from the library's files: a second component registry and a second React Native. A copy at a
  version of the library's own still resolves where it is, as does a package the app does not reach,
  and Metro warns when that puts two versions of an `@ng-native/*` package in the bundle, as it
  already did for `@angular/core`.

- `withAngularNative` now resolves `@babel/runtime` from the app's project first, so every helper import Expo's Babel preset writes reaches the Babel 7 runtime the app installed, not Babel 8's. ([#80](https://github.com/ng-native/ng-native/pull/80), [#76](https://github.com/ng-native/ng-native/issues/76))

  Under pnpm, a file in a package that does not declare `@babel/runtime` looks in
  `node_modules/.pnpm/node_modules` before the workspace root. An install from before the root's
  `@babel/runtime` 7 entry, in a workspace with `@angular-devkit/build-angular`, leaves Babel 8's
  runtime there, and later installs keep it. When the project reaches no copy, the import resolves
  from where it is written, as before.

- `nx g @ng-native/nx:app` in a package-manager workspace now lists the root's Vitest, Angular and other shared dependencies in the app's `package.json` when Angular Native accepts them, instead of adding Vitest 5 beside a workspace's Vitest 4. ([#54](https://github.com/ng-native/ng-native/pull/54), [#41](https://github.com/ng-native/ng-native/issues/41))
- `nx g @ng-native/nx:app` now sets `ios.bundleIdentifier` and `android.package` in the app's `app.json`, from a new `--bundleIdentifier` option or, by default, `com.<workspace scope>.<name>`, so `expo prebuild` no longer falls back to `com.anonymous.<name>`. ([#66](https://github.com/ng-native/ng-native/pull/66), [#45](https://github.com/ng-native/ng-native/issues/45))
- `nx g @ng-native/nx:app --help` now prints the generator's description instead of `undefined`. ([#55](https://github.com/ng-native/ng-native/pull/55), [#42](https://github.com/ng-native/ng-native/issues/42))
- `nx g @ng-native/nx:app` now writes a `.gitignore` in the app that ignores the `ios/` and `android/` projects `expo prebuild` generates, as the starter template does. ([#62](https://github.com/ng-native/ng-native/pull/62), [#44](https://github.com/ng-native/ng-native/issues/44))
- `nx add @ng-native/nx` in a workspace with package-manager workspaces now pins `expo`, `react` and `react-native` at the root to the app's versions, and no longer adds `@expo/cli` there, so pnpm stops installing a second, newer React Native and React for `@nx/expo`'s `expo` peer. ([#64](https://github.com/ng-native/ng-native/pull/64), [#38](https://github.com/ng-native/ng-native/issues/38))
- `nx add @ng-native/nx` and `nx g @ng-native/nx:app` now write exact versions in a workspace that saves them, reading pnpm's, npm's, Yarn's and Bun's settings for it: the newest version each range allows, as `pnpm add` would save it, or the lowest when the registry cannot be reached. An app in a package-manager workspace takes the root's version of a package the root already pins, so its Angular and TypeScript do not drift from the rest of the workspace. ([#67](https://github.com/ng-native/ng-native/pull/67), [#40](https://github.com/ng-native/ng-native/issues/40))
- An app from `nx g @ng-native/nx:app` now has a `serve` target that runs `expo start`, in place of the `expo start --web` `@nx/expo` infers for every Expo app, since the app has no web platform. ([#58](https://github.com/ng-native/ng-native/pull/58), [#43](https://github.com/ng-native/ng-native/issues/43))
- `nx g @ng-native/nx:app` now adds the app's own directory to the workspace's packages, not a glob of its parent, when another directory there already has a `package.json`. A workspace that lists its apps one by one keeps doing so, and no other package joins the workspace unasked. ([#59](https://github.com/ng-native/ng-native/pull/59), [#39](https://github.com/ng-native/ng-native/issues/39))
- `nx g @ng-native/nx:app` now reaches a workspace's tsconfig path aliases in a package-manager workspace too, as it already did in an integrated one: the app's `tsconfig.json` extends `tsconfig.base.json` when it has a `paths` list, and its Vitest config resolves them, so `nx typecheck`, `nx test` and Metro find the workspace's libraries. ([#57](https://github.com/ng-native/ng-native/pull/57), [#36](https://github.com/ng-native/ng-native/issues/36))
- `StyleSheet` now declares the `fonts` a compiled sheet carries, so `loadFonts()` accepts the generated Tailwind module and `styleSheetOf()` as the docs show. Both failed to typecheck with `TS2559: Type 'StyleSheet' has no properties in common with type 'SheetWithFonts'`. ([#60](https://github.com/ng-native/ng-native/pull/60), [#50](https://github.com/ng-native/ng-native/issues/50))
- `font-mono` uses an app's own monospace font on every platform. On Tailwind 4, an ([#68](https://github.com/ng-native/ng-native/pull/68), [#48](https://github.com/ng-native/ng-native/issues/48))
  `@theme { --font-mono: ... }` after `native.css` used to lose on device to the preset's Menlo and
  `monospace` rules; those now set a custom property on the root that the app's `--font-mono`
  replaces. On Tailwind 3, `preset.cjs` no longer sets `theme.extend.fontFamily.mono`, which
  overrode a `mono` from the config or an earlier preset, and adds its `Courier New`, Menlo and
  `monospace` utilities only while `fontFamily.mono` is Tailwind's own `ui-monospace` stack.

- The generated `.angular-native/app.tailwind.d.ts` now imports `StyleSheet` with `import type` instead of an `import()` type, which typescript-eslint's `consistent-type-imports` rule reported as an error when an app's lint reached the file. ([#65](https://github.com/ng-native/ng-native/pull/65), [#53](https://github.com/ng-native/ng-native/issues/53))
- An `@font-face` in the Tailwind entry now bundles its font file. The generated `.angular-native/app.tailwind.js` held the `url()` as a plain path, so Metro never shipped the file and `loadFonts()` had nothing to register; it is now an import, re-pointed from the entry's folder to the generated module's. ([#56](https://github.com/ng-native/ng-native/pull/56), [#49](https://github.com/ng-native/ng-native/issues/49))
- Tailwind's theme tokens are now resolved on device, as on the web: an element that sets `--color-brand` or `--spacing`, from a component stylesheet, a `style` attribute, a `[style.--x]` binding or code, restyles every utility inside it that reads that token, in Tailwind 3 and 4. Tokens of bare colour channels (`--primary: 0 100% 50%` read through `hsl(var(--primary))`), colour tokens defined with `color-mix()`, tokens defined as `calc()` of another (percentages included, as Open Props writes its shadows), and transition, animation and filter values taken from a token now compile. Tailwind 3's `bg-opacity-*` classes fade a colour whose channels are a token, arithmetic around a token in `em` keeps its sign, `max()` and `min()` take two tokens, and the type scale's line heights land on whole points. Nodes that match the same rules under the same parent now share one resolved style, which roughly halves the time to style a long list of cards. ([#94](https://github.com/ng-native/ng-native/pull/94))
- `ios:`, `android:`, `web:`, `native:`, `dark:` and the platform `font-mono` match under a Tailwind 3 ([#69](https://github.com/ng-native/ng-native/pull/69), [#47](https://github.com/ng-native/ng-native/issues/47))
  `prefix`. Tailwind 3 prefixes every class in a variant's selector, so they matched `.tw-platform-ios`
  and `.tw-dark`, which nothing sets. `preset.cjs` records the prefix and `flattenTailwind` takes it back
  off those classes, so they match the `platform-*` and `dark` classes `mount` and `watchConditions`
  put on the root. The dark class stays `dark` with a prefix.

- The Tailwind 3 docs, the `@ng-native/tailwind` README and `preset.cjs` say how to list the preset ([#63](https://github.com/ng-native/ng-native/pull/63), [#46](https://github.com/ng-native/ng-native/issues/46))
  beside an app's own preset: after it, as `{ ...require('@ng-native/tailwind/preset.cjs'), presets: [] }`.
  Listed plainly after another preset, Tailwind 3's default theme, which it adds beneath each preset
  with no `presets` key, overrides that preset's `spacing`, `fontSize`, `colors` and the rest.

- `@ng-native/tailwind/preset.cjs` ships type declarations, so a `tailwind.config.ts` in a strict ([#61](https://github.com/ng-native/ng-native/pull/61), [#52](https://github.com/ng-native/ng-native/issues/52))
  TypeScript project can import the Tailwind 3 preset. The import used to fail with TS7016, an
  implicit `any`.

- A custom property declared only under a class, a platform class or a media query, such as `--brand` only under `.dark`, now applies only where that selector matches, instead of `flattenTailwind` substituting its one value everywhere and painting the dark value in light mode too. ([#86](https://github.com/ng-native/ng-native/pull/86))

  `flattenTailwind` substitutes a custom property at build time only when it is declared on `:root`, `:host`, `html` or `*` outside any at-rule, or through an `@property` initial value, and has one value. Any other `var()` of it is left for the engine to resolve per node, fallback included, so `var(--brand, red)` is `red` without the `.dark` class. The same applies to a Tailwind arbitrary property such as `[--my-var:red]`, which now reaches only the elements wearing that class. Tailwind's own `--tw-*` properties are unchanged.

- A themed custom property read with a fallback, such as `var(--brand, red)` where `--brand` is ([#72](https://github.com/ng-native/ng-native/pull/72), [#70](https://github.com/ng-native/ng-native/issues/70))
  declared under both `:root` and `.dark`, resolves per node on device, like one read without a
  fallback. `flattenTailwind` used to replace it with the fallback, so neither theme's value applied.

### ❤️ Thank You

- Ashley Hunter

## 0.1.2 (2026-09-30)

### 🚀 Features

- `<section-list>` draws a separator at each edge of a section, as `SectionSeparatorComponent` does. ([#23](https://github.com/ng-native/ng-native/pull/23))
  `<ng-template sectionEdgeSeparator>` is drawn between a section's header and its first item and
  between its last item and its footer, and is told the section and the sections either side. It used
  to be missing, and the documentation said to draw one inside the header or footer template instead.


### 🩹 Fixes

- `DeepLinks` delivers the url an app was launched with to every `subscribe()` listener rather than ([#24](https://github.com/ng-native/ng-native/pull/24))
  only the last one to subscribe, and one listener stopping no longer stops it reaching the others.
  An app that subscribed alongside the router took the launch link from it, and one that subscribed
  and stopped before the url was known left the router never following it.

- `DeepLinks` delivers the launch url to each `subscribe()` separately. A listener that throws is ([#28](https://github.com/ng-native/ng-native/pull/28))
  reported to Angular's `ErrorHandler` and no longer keeps the launch url from the listeners after
  it, such as the router's. The same function subscribed twice keeps getting the launch url until
  both subscriptions stop, not just one.

- `nx g @ng-native/nx:app` and `ng add @ng-native/schematics` now install `expo` `~57.0.26`, the current SDK 57 release, as `npx expo install --check` expects, and the starter template matches. ([#31](https://github.com/ng-native/ng-native/pull/31))
- `FileSystem.cache()` and `FileSystem.document()` now throw `[angular-native] expo-file-system is not installed` on the web and in a test with no fake source, as documented, instead of a `TypeError` about `cacheDirectory` or `documentDirectory`. ([#20](https://github.com/ng-native/ng-native/pull/20), [#13](https://github.com/ng-native/ng-native/issues/13))
- `nx g @ng-native/nx:app` and `ng add @ng-native/schematics` now install `expo-system-ui` with the app, as the starter template does, so the app's `userInterfaceStyle` applies on Android. ([#20](https://github.com/ng-native/ng-native/pull/20), [#13](https://github.com/ng-native/ng-native/issues/13))
- `StatusBar` changes the bar again in an app built with the iOS 27 SDK, where UIKit ignores the app-wide setters React Native's status bar module calls. `@ng-native/metro`'s config plugin now answers those calls from the view controllers iOS asks, the window's root and a screen or React Native modal presented full screen, and sets `UIViewControllerBasedStatusBarAppearance`. `expo-status-bar` and React Native's own `StatusBar` work again too. Until the app claims a style or visibility, a screen's own `statusBarStyle` and `statusBarHidden` apply. An existing app picks it up with `npx expo prebuild --clean`. ([#32](https://github.com/ng-native/ng-native/pull/32))
- `@ng-native/metro` is also an Expo config plugin, `"plugins": ["@ng-native/metro"]`, and the ([#22](https://github.com/ng-native/ng-native/pull/22))
  template and both generators add it. It adopts the UIKit scene life cycle in the `AppDelegate.swift`
  that `expo prebuild` writes, since an app built with the iOS 27 SDK that does not exits at launch
  with "UIScene life cycle is required for apps built with this SDK". React Native now starts from a
  scene delegate, which hands the links the app is opened with and receives, and its life cycle
  events, on to `AppDelegate`, so Expo's modules and code added there see them as before. What
  another plugin adds among the lines it replaces, as `@react-native-firebase/app` does, stays. For
  an app made before this release, add `"plugins": ["@ng-native/metro"]` to `app.json` and run
  `npx expo prebuild --clean`.

- A `StatusBar` claim pushed before the app's first `set()` stays on top. `set()` used to replace ([#19](https://github.com/ng-native/ng-native/pull/19))
  whatever was first on the stack, so a screen that pushed before startup code set the base lost its
  style, and dropping it later restored nothing.

- `StatusBar.set()` and `push()` no longer subscribe the caller to the bar's own state. An app that set its base style in an `effect` had that effect run again on every later `set()` or `push()`, which wrote the base back over what was just set. ([#33](https://github.com/ng-native/ng-native/pull/33))
- A `SecureStorage` signal whose first read fails, such as a keychain the app has no entitlement for, ([#17](https://github.com/ng-native/ng-native/pull/17))
  keeps its default and reports the failure on `error`, as a failed asynchronous read already did.
  It used to throw from `signal()`, so the component asking for it was never created and its screen
  rendered blank.

- The starter template now includes expo-system-ui, so its dark userInterfaceStyle applies on Android in development and release builds instead of being ignored. ([#12](https://github.com/ng-native/ng-native/pull/12))

### ❤️ Thank You

- Ashley Hunter
- erKam @erkamyaman
- Stavros Thalassinos @stavthal

## 0.1.1 (2026-09-29)

### 🩹 Fixes

- An app from `ng add @ng-native/schematics` or `nx g @ng-native/nx:app` starts without warnings. ([#5](https://github.com/ng-native/ng-native/pull/5))
  Its `app.json` sets the router root, as the template's does, so Expo no longer prints "Using
  src/app as the root directory for Expo Router". In Nx, the app's `start` target runs `expo start`
  itself rather than through `@nx/expo:start`, whose deprecation notice Nx printed on every
  `nx start`, and `nx add @ng-native/nx` adds Babel 7's `@babel/runtime` at the root, so Metro no
  longer warns about `@babel/runtime/regenerator` in an `@nx/angular` workspace. For an app made
  before this release, add `"extra": { "router": { "root": "src/app" } }` to its `app.json`; in Nx,
  also add a `start` target running `expo start` in the app's directory and `@babel/runtime@^7.20.0`
  to the root `devDependencies`.

- The template targets iOS and Android only. ([#5](https://github.com/ng-native/ng-native/pull/5))
  Its `app.json` names both as its `platforms`, and the web favicon, its `web` settings and
  `web-build/` in `.gitignore` are gone. The Angular CLI and Nx generators name the same platforms.
  Angular Native components render in a browser through `@ng-native/web`, which is set up
  separately.

### ❤️ Thank You

- Ashley Hunter

## 0.1.0 (2026-09-29)

### 🚀 Features

- The first public release: Angular components as real native iOS and Android views, in an Expo app. ([8803fb6](https://github.com/ng-native/ng-native/commit/8803fb6))
  Angular Native is built on Expo and React Native's Fabric renderer, so an app is created, run, hot
  reloaded, built and shipped with the Expo tooling you already know, and Expo's modules - the photo
  picker, location, Face ID and fingerprint, sign-in through the system browser, pictures from the
  camera view, notifications, secure storage and the rest - are available as Angular services and
  directives. Alongside that: a CSS engine that compiles stylesheets and Tailwind at build time, a
  native stack and tab router over `@angular/router`, Signal Forms support, device services, and a
  testing library that runs components in Node against a fake Fabric.

### ❤️ Thank You

- Ashley Hunter
