# @ng-native/tailwind

A Tailwind CSS v4 preset for Angular Native, on native and web: `<view class="flex-1 bg-blue-500
p-4">` works because [`@ng-native/fabric`](https://github.com/ng-native/ng-native/blob/main/packages/fabric)
already has a real cascade, and `class` already matches against it.

Alpha: APIs may change before 1.0.

## Install

```sh
npm install @ng-native/tailwind @ng-native/metro @tailwindcss/cli tailwindcss
```

## Example

```css
/* styles.css */
@import 'tailwindcss/theme.css';
@import 'tailwindcss/utilities.css';
@import '@ng-native/tailwind/native.css';
```

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withAngularNative } = require('@ng-native/metro/config.cjs');
const { withTailwind } = require('@ng-native/tailwind/config.cjs');

module.exports = withTailwind(withAngularNative(getDefaultConfig(__dirname)), {
  input: './styles.css',
});
```

```ts
// index.ts
import tailwind from './.angular-native/app.tailwind.js';
import { mount } from '@ng-native/platform';

mount(rootTag, App, fabric, { globalStyles: tailwind });
```

Import `theme.css` and `utilities.css`, not the plain `tailwindcss` entry point - that also pulls
in preflight, a browser reset that means nothing on a phone.

## What's in the package

- `./native.css` - the preset: platform variants, safe-area and hairline utilities, and
  touch-appropriate `hover:`/`focus-visible:` meanings.
- `./web.css` - the same preset's web entry point, for `@ng-native/web`.
- `./config.cjs` - `withTailwind`, the Metro config step that runs `@tailwindcss/cli` and flattens
  its output for the CSS compiler.

## Docs

- [Tailwind](https://ng-native.com/packages/tailwind)
- [Variants](https://ng-native.com/packages/tailwind/variants) and
  [safe area and hairlines](https://ng-native.com/packages/tailwind/utilities)
- [Root README](https://github.com/ng-native/ng-native/blob/main/README.md) and
  [ARCHITECTURE.md](https://github.com/ng-native/ng-native/blob/main/ARCHITECTURE.md)

## License

MIT
