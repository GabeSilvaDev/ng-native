/**
 * Fixture for `text-fields.test.ts`. See `button-app.ts`'s doc comment for why a real
 * `@Component` has to live in its own file rather than inside a `.test.ts` one.
 *
 * `controls.test.ts` already proves a real keystroke reaches `@ng-native/components`' own
 * `TextInput` and reflects a model write back into the field, so this fixture is for what a
 * styled field built on top of it adds: `invalid`/`touched` -> `data-invalid`, real focus (from
 * the field's own `(focus)` and `(blur)`) -> `data-focus`, `disabled` -> `readOnly`, and a
 * one-time-code field with one real, hidden control and a row of display-only glyphs computed
 * from the value's length - the same shape `packages/ui`'s (deleted) `Input`/`Textarea`/
 * `InputOtp` built out of these same parts.
 */
import { Component, computed, effect, signal } from '@angular/core';
import { TextInput, View } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [TextInput, View],
  template: `
    <view
      id="plain"
      class="border border-gray-300 focus-visible:border-blue-500"
      [attr.data-disabled]="off() ? '' : null"
      [attr.data-focus]="plainFocused() ? '' : null"
    >
      <text-input
        (focus)="plainFocused.set(true)"
        (blur)="plainFocused.set(false)"
        [(value)]="value"
        placeholder="you@example.com"
        [editable]="!off()"
      />
    </view>
    <view
      id="validated"
      [attr.data-invalid]="invalid() && touched() ? '' : null"
      [attr.data-focus]="focused() ? '' : null"
    >
      <text-input
        [(value)]="validatedValue"
        (focus)="focused.set(true)"
        (blur)="focused.set(false); touchedFired.set(true)"
      />
    </view>
    <view id="notes">
      <text-input [(value)]="notes" [multiline]="true" [numberOfLines]="3" />
    </view>
  `,
})
export class TextFieldApp {
  readonly value = signal('');
  readonly off = signal(false);
  readonly validatedValue = signal('');
  readonly invalid = signal(false);
  readonly touched = signal(false);
  readonly touchedFired = signal(false);
  readonly notes = signal('');
  readonly plainFocused = signal(false);
  readonly focused = signal(false);
}

/** The boxes to draw, given the code so far - `packages/ui`'s (deleted) `input-otp.ts`'s `slotsFor`. */
function slotsFor(value: string, length: number): readonly string[] {
  const characters = [...value].slice(0, length);
  return Array.from({ length }, (_, index) => characters[index] ?? '');
}

@Component({
  selector: 'app-root',
  imports: [TextInput, View],
  template: `
    <view id="otp">
      <text-input
        data-slot="input-otp-field"
        [(value)]="code"
        [maxLength]="length()"
        [editable]="!disabled()"
      />
      <view style="flex-direction: row">
        @for (char of slots(); track $index) {
          <text-input [value]="char" [editable]="false" />
        }
      </view>
    </view>
  `,
})
export class OtpApp {
  readonly code = signal('');
  readonly length = signal(4);
  readonly disabled = signal(false);
  readonly completions: string[] = [];

  protected readonly slots = computed(() => slotsFor(this.code(), this.length()));

  constructor() {
    // Fires once the last box is filled, the same as `input-otp.ts`'s own `complete` output.
    effect(() => {
      const code = this.code();
      if (code.length === this.length()) this.completions.push(code);
    });
  }
}
