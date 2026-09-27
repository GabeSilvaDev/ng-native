import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from '@ng-native/components';
import { Haptics } from '@ng-native/expo/haptics';
import { NativeNavigation } from '@ng-native/router';
import { Ledger, money } from '../payments/ledger.ts';

/** Pounds as typed - 12, 12.5, 1,200.00 - in whole pence, or NaN for anything else. */
export function toPence(text: string): number {
  const clean = text.replace(/[£,\s]/g, '');
  return /^\d+(\.\d{1,2})?$/.test(clean) ? Math.round(Number(clean) * 100) : Number.NaN;
}

/**
 * Sending money: a Signal Form over native text fields, presented as a modal.
 *
 * Styled with component CSS rather than Tailwind, to show the other half of the styling story:
 * custom properties on :host, attribute selectors, :active with a transition, and a
 * prefers-color-scheme query, all compiled at build time.
 */
@Component({
  selector: 'app-send',
  imports: [FormField, Pressable, SafeAreaView, ScrollView, Text, TextInput, View],
  template: `
    <safe-area-view class="screen" [edges]="['top', 'bottom']">
      <view class="bar">
        <pressable accessibilityRole="button" (press)="close()">
          <text class="link">Cancel</text>
        </pressable>
        <text class="title">Send money</text>
        <view class="spacer"></view>
      </view>

      <scroll-view class="fill" keyboardShouldPersistTaps="handled">
        <view class="body">
          <text class="label">To</text>
          <text-input
            class="field"
            placeholder="Name"
            accessibilityLabel="Recipient"
            autoCapitalize="words"
            [formField]="f.to"
          />

          <text class="label">Amount</text>
          <text-input
            class="field amount"
            placeholder="£0.00"
            accessibilityLabel="Amount"
            keyboardType="decimal-pad"
            [formField]="f.amount"
          />
          @if (f.amount().touched() && f.amount().errors()[0]; as error) {
            <text class="error">{{ error.message }}</text>
          }

          <view class="chips">
            @for (quick of quickAmounts; track quick) {
              <pressable
                class="chip"
                accessibilityRole="button"
                [attr.data-selected]="data().amount === quick ? '' : null"
                (press)="choose(quick)"
              >
                <text class="chip-label">£{{ quick }}</text>
              </pressable>
            }
          </view>

          <text class="label">Note</text>
          <text-input
            class="field"
            placeholder="What it is for"
            accessibilityLabel="Note"
            [formField]="f.note"
          />

          <text class="hint">Available: {{ available() }}</text>
        </view>
      </scroll-view>

      <pressable
        class="submit"
        accessibilityRole="button"
        [accessibilityState]="{ disabled: f().invalid() }"
        [attr.data-disabled]="f().invalid() ? '' : null"
        (press)="submit()"
      >
        <text class="submit-label">{{ label() }}</text>
      </pressable>
    </safe-area-view>
  `,
  styles: `
    :host {
      --accent: #e11d48;
      --surface: #ffffff;
      --ink: #18181b;
      --muted: #71717a;
      --line: #e4e4e7;
      flex: 1;
    }
    .screen {
      flex: 1;
      background-color: #f4f4f5;
    }
    .bar {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
    }
    .title {
      font-size: 17px;
      font-weight: 600;
      color: var(--ink);
    }
    .link {
      font-size: 17px;
      color: var(--accent);
    }
    .spacer {
      width: 56px;
    }
    .fill {
      flex: 1;
    }
    .body {
      gap: 8px;
      padding: 12px 20px;
    }
    .label {
      margin-top: 12px;
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field {
      padding: 14px 16px;
      border-radius: 14px;
      border-width: 1.5px;
      border-color: var(--line);
      background-color: var(--surface);
      font-size: 17px;
      color: var(--ink);
    }
    .field[data-invalid][data-touched] {
      border-color: var(--accent);
    }
    .amount {
      font-size: 28px;
      font-weight: 700;
    }
    .error {
      font-size: 13px;
      color: var(--accent);
    }
    .chips {
      flex-direction: row;
      gap: 8px;
    }
    .chip {
      padding: 8px 16px;
      border-radius: 999px;
      border-width: 1.5px;
      border-color: var(--line);
      background-color: var(--surface);
      transition: transform 120ms;
    }
    .chip:active {
      transform: scale(0.94);
    }
    .chip[data-selected] {
      border-color: var(--accent);
    }
    .chip-label {
      font-weight: 600;
      color: var(--ink);
    }
    .chip[data-selected] .chip-label {
      color: var(--accent);
    }
    .hint {
      margin-top: 12px;
      color: var(--muted);
    }
    .submit {
      align-items: center;
      margin: 12px 20px;
      padding: 16px;
      border-radius: 16px;
      background-color: var(--accent);
      transition: opacity 150ms;
    }
    .submit[data-disabled] {
      opacity: 0.4;
    }
    .submit-label {
      font-size: 17px;
      font-weight: 600;
      color: #ffffff;
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --surface: #18181b;
        --ink: #fafafa;
        --line: #27272a;
      }
      .screen {
        background-color: #000000;
      }
    }
  `,
})
export class Send {
  private readonly ledger = inject(Ledger);
  private readonly haptics = inject(Haptics);
  private readonly navigation = inject(NativeNavigation);

  protected readonly quickAmounts = ['10', '20', '50'];
  protected readonly data = signal({ to: '', amount: '', note: '' });
  protected readonly f = form(this.data, (path) => {
    required(path.to, { message: 'Who is it for?' });
    required(path.amount, { message: 'Enter an amount' });
    validate(path.amount, ({ value }) => {
      if (!value()) return undefined;
      const pence = toPence(value());
      if (!(pence > 0)) return { kind: 'amount', message: 'Enter an amount' };
      if (pence > this.ledger.balance()) return { kind: 'balance', message: 'More than you have' };
      return undefined;
    });
  });

  protected readonly available = computed(() => money(this.ledger.balance()));
  protected readonly label = computed(() => {
    const pence = toPence(this.data().amount);
    return Number.isNaN(pence) || pence === 0 ? 'Send' : `Send ${money(pence)}`;
  });

  protected choose(amount: string): void {
    this.data.update((d) => ({ ...d, amount }));
    this.haptics.select();
  }

  protected submit(): void {
    if (this.f().invalid()) {
      this.haptics.notify('error');
      return;
    }
    const { to, amount, note } = this.data();
    this.ledger.send(to.trim(), toPence(amount), note.trim());
    this.haptics.notify('success');
    this.navigation.back();
  }

  protected close(): void {
    this.navigation.back();
  }
}
