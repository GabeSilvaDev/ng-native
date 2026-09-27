# @ng-native/components

The React Native element set as Angular components: `<view>`, `<text>`, `<scroll-view>`,
`<text-input>` and the rest, each committing as a real native view through React Native's Fabric
renderer.

Alpha: APIs may change before 1.0.

## Install

Most apps start from `npx create-expo-app@latest my-app --template @ng-native/template`, which
already has this and its peers set up. Otherwise:

```sh
npm install @ng-native/components
npm install @angular/core react-native
```

`react-native-gesture-handler` and `react-native-reanimated` are optional peers, needed only for
gestures and Reanimated worklets.

## Example

```ts
import { Component, input } from '@angular/core';
import { View, Text } from '@ng-native/components';

@Component({
  selector: 'app-greeting',
  imports: [View, Text],
  template: `
    <view>
      <text>Hello, {{ name() }}</text>
    </view>
  `,
})
export class Greeting {
  readonly name = input('there');
}
```

A template that writes `<scroll-view>` needs `ScrollView` in its `imports`; without it, the element
renders as a plain, unstyled view and logs a console warning in development.

## What's in the package

- `.` - `View`, `Text`, `ScrollView`, `TextInput`, `Pressable`, `Image`, `Switch`,
  `ActivityIndicator`, `Modal`, `VirtualList`, `SafeAreaProvider`, `SafeAreaView`, and the event
  payload types (`LayoutEvent`, `TouchEvent`, `ScrollEvent`, and more).
- `./gestures.ts` - React Native Gesture Handler bindings.
- `./animations.ts` - `AnimatedStyle`, `Animated` and `Easing`: React Native's graph on a device,
  a React-free one with the same API in a browser build.
- `./reanimated.ts` - Reanimated worklet bindings.

These three are separate entry points because each reaches into React Native's own uncompiled
source, which Node cannot parse; importing them from the main entry point would break loading this
package under Node (tests, tooling).

## Docs

- [Components](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components.md)
- [Layout](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/layout.md),
  [scroll view](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/scroll-view.md),
  [keyboard-avoiding view](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/keyboard-avoiding-view.md),
  [lists](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/lists.md),
  [text](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/text.md),
  [image](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/image.md),
  [activity indicator](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/activity-indicator.md),
  [text input](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/input.md),
  [switch](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/switch.md),
  [pressable](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/pressable.md),
  [gestures](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/gestures.md),
  [modal](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/modal.md) and
  [animation](https://github.com/ng-native/ng-native/blob/main/apps/documentation/src/content/packages/components/animation.md)
- [Root README](https://github.com/ng-native/ng-native/blob/main/README.md) and
  [ARCHITECTURE.md](https://github.com/ng-native/ng-native/blob/main/ARCHITECTURE.md)

## License

MIT
