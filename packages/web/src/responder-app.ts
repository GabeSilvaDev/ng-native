/**
 * Fixture for `responder.test.ts`. See `button-app.ts`'s doc comment for why a real `@Component`
 * has to live in its own file rather than inside a `.test.ts` one.
 *
 * A pressable nested inside a scroll view, nested inside another pressable - the shape the report
 * calls out as the hard case: an ancestor pressable, a scroll view in between, and the innermost
 * pressable are all candidate responders on the same touch path.
 */
import { Component, signal } from '@angular/core';
import { Pressable, ScrollView, Text } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Pressable, ScrollView, Text],
  template: `
    <pressable (press)="logOuterPress()">
      <text>outer</text>
      <scroll-view>
        <pressable (press)="logInnerPress()">
          <text>inner</text>
        </pressable>
      </scroll-view>
    </pressable>
  `,
})
export class NestedPressApp {
  readonly log = signal<string[]>([]);

  logOuterPress(): void {
    this.log.update((entries) => [...entries, 'outer']);
  }

  logInnerPress(): void {
    this.log.update((entries) => [...entries, 'inner']);
  }
}
