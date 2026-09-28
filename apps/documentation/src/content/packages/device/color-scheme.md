---
title: Color scheme
summary: Light or dark mode, as the user set it, for the decisions CSS cannot make.
---

# Color scheme

`ColorScheme` reports whether the user has the system in light or dark mode.

```ts
import { Component, computed, inject } from '@angular/core';
import { Image } from '@ng-native/components';
import { ColorScheme } from '@ng-native/device';

@Component({ selector: 'app-logo', imports: [Image], template: `<image [source]="logo()" />` })
export class Logo {
  private readonly scheme = inject(ColorScheme);
  protected readonly logo = computed(() =>
    this.scheme.current() === 'dark' ? require('./logo-dark.png') : require('./logo-light.png'),
  );
}
```

Styling should almost never touch this directly: `@media (prefers-color-scheme: dark)` and
Tailwind's `dark:` variant are resolved by the engine without anything being injected, and they are
the right tool for "this text is a different color in dark mode." `ColorScheme` is for the
decisions a stylesheet cannot make - which image asset to load, which of two distinct native
components to render, which status bar style to request.

## Off a device and on the web

Off a device `current()` reports `light` and never changes, because there is no `Appearance` module
underneath it to ask - a platform's absence of a preference is treated as light, which is the same
rule React Native's own `null` result follows. On the web the engine answers
`prefers-color-scheme` itself, so an app rarely needs to inject `ColorScheme` there at all.

## Reference

<!-- api: ColorScheme -->
