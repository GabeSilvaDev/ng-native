# @ng-native/device

The host: the device, the operating system, and the user's settings.

Alpha: APIs may change before 1.0.

## Install

```sh
npm install @ng-native/device
npm install @angular/core react-native
```

## Example

```ts
import { Accessibility, Keyboard, Screen } from '@ng-native/device';

export class Composer {
  private readonly keyboard = inject(Keyboard);
  private readonly screen = inject(Screen);
  private readonly accessibility = inject(Accessibility);

  protected readonly wide = computed(() => this.screen.window().width > 600);
  protected readonly clearance = computed(() => this.keyboard.height() + 16);

  protected saved(): void {
    this.accessibility.announce('Draft saved');
  }
}
```

Nothing is provided anywhere. Each service declares its own factory, so injecting it is the whole
setup, and one nobody injects is never constructed.

| Service         | What                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| `Keyboard`      | `height`, `visible` and the full `metrics`, plus `dismiss()`.          |
| `Screen`        | `window`, `display` and `orientation`, following a rotation.           |
| `ColorScheme`   | `current`: light or dark, as the user set it.                          |
| `AppState`      | `current` and `active`: whether the app is in front of the user.       |
| `Accessibility` | `screenReader`, `reduceMotion`, `boldText`, and `announce()`.          |
| `HardwareBack`  | `handle()`: Android's back button, answering whether it was consumed.  |
| `DeepLinks`     | `initialUrl()`, `subscribe()` and `open()`, as paths rather than urls. |

## Styling reads most of this without injecting anything

The engine answers `@media (prefers-color-scheme: dark)`, `(orientation: landscape)`,
`(min-width: …)` and `(prefers-reduced-motion: reduce)` from the same values, so styling should use
a media query and leave these services for the decisions CSS cannot make - which asset to load,
which native component to render, whether to announce something. `watchConditions(engine)` is what
keeps the engine in step; an app calls it once, next to `mount`.

## Testing

Every service reads its platform through a token that hangs off the service itself, so a test
overrides the token rather than the service and the code under test stays real:

```ts
mount(1, App, fabric, {
  providers: [
    { provide: Keyboard.SOURCE, useValue: { subscribe: fakeKeyboard, dismiss: () => {} } },
  ],
});
```

## Off a device

`react-native` is required lazily, inside each source, because React Native ships its JavaScript as
Flow and a static import would make this package - and `@ng-native/components`, which imports
it - unloadable in Node. Off a device the require finds nothing and every capability is inert: the
keyboard is never visible, the screen is zero by zero, a back handler is never called. That is the
same behavior as not providing the token that used to stand here, and it is what lets the test
suite import any of this without a simulator.
