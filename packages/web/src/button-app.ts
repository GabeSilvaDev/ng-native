/**
 * A button for the tests that need one on screen: `measure.test.ts` places it, and
 * `browser/styling.test.ts` checks the disabled variant resolves against it. A real `@Component`
 * has to live outside a `.test.ts` file and outside a `fixtures/` directory: the linker loader
 * compiles every workspace `.ts` file except those two.
 */
import { Component, signal } from '@angular/core';
import { Pressable, Text } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Pressable, Text],
  template: `
    <pressable
      id="trigger"
      accessibilityRole="button"
      class="transition-opacity disabled:opacity-50"
      [attr.data-disabled]="disabled() ? '' : null"
      [disabled]="disabled()"
      (press)="onPress()"
    >
      <text>{{ label() }}</text>
    </pressable>
  `,
})
export class ButtonApp {
  readonly disabled = signal(false);
  readonly presses = signal(0);
  readonly label = signal('Delete');

  onPress(): void {
    this.presses.update((n) => n + 1);
  }
}
