/**
 * Fixture for `field-forms.test.ts`. See `button-app.ts`'s doc comment for why a real
 * `@Component` has to live in its own file rather than inside a `.test.ts` one.
 *
 * `[formField]` (`@angular/forms/signals`) finds `value` on `text-input` by name - it is already
 * a `model()` called `value`, exactly what Signal Forms looks for - and listens for an output
 * literally named `touch` to mark a field touched. `packages/ui`'s (deleted) `Input`/`Textarea`
 * wired that second half from a real blur; `TouchOnBlur` below is that same one line, extracted
 * so this fixture does not need a whole styled input component to prove it.
 */
import { Component, Directive, computed, output, signal } from '@angular/core';
import { FormField, form, minLength, required, schema } from '@angular/forms/signals';
import { Text, TextInput, View } from '@ng-native/components';

const profile = schema<{ email: string; notes: string }>((path) => {
  required(path.email, { message: 'Email is required' });
  minLength(path.notes, 5, { message: 'Say a little more' });
});

@Directive({ selector: 'text-input[formField]', host: { '(blur)': 'touch.emit()' } })
class TouchOnBlur {
  readonly touch = output<void>();
}

function messagesOf(errors: readonly { message?: string; kind?: string }[]): readonly string[] {
  // De-duplicated by message text, the way `packages/ui`'s (deleted) `FieldError` did: two rules
  // failing with the same wording are one thing wrong, not two.
  return [...new Set(errors.map((e) => e.message ?? e.kind ?? 'Invalid'))];
}

@Component({
  selector: 'app-root',
  imports: [FormField, Text, TextInput, TouchOnBlur, View],
  template: `
    <view id="email-field">
      <view id="email">
        <text-input [formField]="signUp.email" placeholder="you@example.com" />
      </view>
      <view id="email-error">
        @if (emailVisible()) {
          @for (message of emailErrors(); track message) {
            <text>{{ message }}</text>
          }
        }
      </view>
    </view>

    <view id="notes-field">
      <view id="notes">
        <text-input [formField]="signUp.notes" [multiline]="true" />
      </view>
      <view id="notes-error">
        @for (message of notesErrors(); track message) {
          <text>{{ message }}</text>
        }
      </view>
    </view>
  `,
})
export class FieldFormsApp {
  // `notes` starts short rather than empty: `minLength` skips an empty value (the same way the
  // DOM's own `minlength` does), so an empty field would simply be valid and prove nothing.
  readonly model = signal({ email: '', notes: 'hi' });
  readonly signUp = form(this.model, profile);

  protected readonly emailErrors = computed(() => messagesOf(this.signUp.email().errors()));
  protected readonly emailVisible = computed(
    () => this.emailErrors().length > 0 && this.signUp.email().touched(),
  );
  // `always`: shown with no touch needed, unlike the email field above.
  protected readonly notesErrors = computed(() => messagesOf(this.signUp.notes().errors()));
}
