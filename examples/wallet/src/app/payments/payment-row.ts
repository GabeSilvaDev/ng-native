import { Component, computed, input } from '@angular/core';
import { Text, View } from '@ng-native/components';
import { TINTS, money, type Payment } from './ledger.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today, Yesterday, or 12 Sep. */
export function dayOf(date: Date, today = new Date()): string {
  const days = Math.round(
    (new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 864e5,
  );
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** One payment: who, what kind and when, and how much. */
@Component({
  selector: 'app-payment-row',
  imports: [Text, View],
  template: `
    <view class="flex-row items-center gap-3">
      <view
        class="size-11 items-center justify-center rounded-xl"
        [style.background-color]="tint()"
      >
        <text class="font-bold text-white">{{ payment().name[0] }}</text>
      </view>
      <view class="flex-1">
        <text class="font-semibold text-zinc-900 dark:text-white">{{ payment().name }}</text>
        <text class="text-xs text-zinc-500 dark:text-zinc-400">{{ detail() }}</text>
      </view>
      <text
        class="font-semibold"
        [class]="payment().pence > 0 ? 'text-emerald-600' : 'text-zinc-900 dark:text-white'"
        >{{ amount() }}</text
      >
    </view>
  `,
})
export class PaymentRow {
  readonly payment = input.required<Payment>();

  protected readonly tint = computed(() => TINTS[this.payment().category] ?? '#71717a');
  protected readonly detail = computed(
    () => `${this.payment().category} · ${dayOf(this.payment().date)}`,
  );
  protected readonly amount = computed(() => money(this.payment().pence, { signed: true }));
}
