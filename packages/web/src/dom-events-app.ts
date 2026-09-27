/**
 * Fixture for `dom-events.test.ts`. See `button-app.ts` for why a `@Component` lives out here
 * rather than in the test file.
 *
 * Deliberately plain bindings on plain elements. What is under test is the renderer's `listen`,
 * not any component: `(click)` on an `<a>` is what Angular's own `RouterLink` compiles to, and it
 * was the binding that silently never fired.
 */
import { Component, signal } from '@angular/core';
import { Text, View } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Text, View],
  template: `
    <view>
      <a nativeID="link" href="/somewhere" (click)="navigate($event)">
        <text>Accordion</text>
      </a>
      <view nativeID="outer" (click)="outerClicks.set(outerClicks() + 1)">
        <view nativeID="inner"><text>inside</text></view>
      </view>
      <input nativeID="field" (keydown)="keys.set(keys() + 1)" />
    </view>
  `,
})
export class DomEventsApp {
  readonly navigations = signal(0);
  readonly defaultPrevented = signal(false);
  readonly outerClicks = signal(0);
  readonly keys = signal(0);

  /** What `RouterLink` does: read the event, then stop the browser following the href. */
  navigate(event: MouseEvent): void {
    this.navigations.update((n) => n + 1);
    event.preventDefault();
    this.defaultPrevented.set(event.defaultPrevented);
  }
}
